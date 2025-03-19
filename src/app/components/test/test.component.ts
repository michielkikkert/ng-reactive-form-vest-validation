import { Component, computed } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { suite } from '../../validators/validations';

type FormConfigItem = {
	name: string;
	label: string;
	fieldType?: string;
	formType?: 'FormControl' | 'FormArray' | 'FormGroup';
	value: string | number | boolean | any[] | FormConfigItem[];
	skipValidation?: boolean;
};

type FormConfig = FormConfigItem & {
	fields?: FormConfigItem[];
};

@Component({
	selector: 'app-test',
	templateUrl: './test.component.html',
	imports: [JsonPipe, ReactiveFormsModule],
	styleUrls: ['./test.component.scss'],
})
export class TestComponent {

	// This factory Function returns the Vest validator and does some stuff to handle FormGroups and FormArrays as well.
	private vestValidatorFactory = (field = '', group = '') => {
		return (control: AbstractControl): ValidationErrors | null => {
			const controlName = Object.keys(control.parent?.controls || {}).find((key) => control.parent?.get(key) === control);
			if (!controlName) return null;

			const isFormGroup = control instanceof FormGroup;
			const isFormArray = control instanceof FormArray;

			// get the current state of the form (looking up to 3 levels up from the current control)
			const form = control.parent?.parent?.parent || control.parent?.parent || control.parent || new FormGroup({});
			// Update the form (value) so it is up to date with the incoming control
			form.updateValueAndValidity();
			// Get the (parent) form value
			const formValue = form.value;

			// Run the validation suite for the current field against the root form
			const result = suite(formValue, field, group).getErrors();

			// Handle FormArray
			if (isFormArray) {
				const controlGroup = control?.controls;
				(form.controls as Record<string, any>)[controlName].controls.forEach((controlInForm: FormGroup<any>, index: number) => {
					const current = (controlGroup[index] as FormGroup)?.controls;
					// Find the current control inside the FormArray
					if (current === controlInForm?.controls) {
						Object.keys(current).forEach((key) => {
							// This (complex) field identifier is needed so Vest can test individual, index based fields inside FormArray
							const field = `${controlName}-${key}-${index}`;
							// Now run the suite again, but with the correctly scoped field
							const currentResult = suite(formValue, field, group, controlName).getErrors()?.[field];
							// Check for errors and manually set the Errors on the array control.
							// This is needed because in a formArray the internal controls
							// might not have validators set.
							if (currentResult?.length) {
								current[key].setErrors({ message: currentResult[0] });
							} else {
								current[key].setErrors(null);
							}
						});
					}
				});
			}

			// Handle FormGroup
			if (isFormGroup) {
				const controlGroup = control?.controls;
				Object.entries(controlGroup).forEach(([name, control]) => {
					if (result[name]) {
						control.setErrors({ message: result[name][0] });
					} else {
						control.setErrors(null);
					}
				});
			}

			const errors = result[field];
			return errors ? { message: errors } : null;
		};
	};

	public form = new FormGroup({
		firstName: new FormControl('', [this.vestValidatorFactory('firstName', 'bla')]),
		lastName: new FormControl('', [this.vestValidatorFactory('lastName')]),
		email: new FormControl('', [this.vestValidatorFactory('email')]),
		passwordGroup: new FormGroup(
			{
				password: new FormControl('abc'),
				confirmPassword: new FormControl('abc'),
			},
			[this.vestValidatorFactory('passwordGroup')],
		),
		children: new FormArray([], [this.vestValidatorFactory('children')]),
	});

	// Just for some debug info in the template
	public formSignal = toSignal(this.form.valueChanges);
	public suiteSignal = computed(() => {
		this.formSignal();
		return suite.getErrors();
	});

	get children() {
		return this.form.controls.children as unknown as FormArray;
	}

	get newChild() {
		return new FormGroup({
			name: new FormControl(''),
			age: new FormControl<number | null>(null),
		});
	}

	addChild() {
		this.children.push(this.newChild);
		this.form.updateValueAndValidity();
	}

	removeChild(childIndex: number) {
		this.children.removeAt(childIndex);
	}

	submit() {
		console.log('SUBMIT');
		console.log('SUITE RESULT', suite.getErrors());

		if (this.form.invalid) {
			this.form.markAllAsTouched(); // This will 'activate' (show) all fields with errors
			return;
		}

		console.log('valid', this.form.valid);
		console.log('value', this.form.value);
	}
}
