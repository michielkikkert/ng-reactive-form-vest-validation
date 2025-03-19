import { create, test, enforce, group, only, skip, warn, each, omitWhen, skipWhen, include } from 'vest';
import 'vest/enforce/email';

export const suite = create((model: any, field: string, groupName, parent: string = '') => {
	only(field);

	// just a group test for later (need to check composition for multiple steps forms)
	group('bla', () => {
		skip(groupName !== 'bla');
		test('firstName', 'Firstname is required', () => {
			enforce(model.firstName).isNotBlank();
		});

		test('firstName', 'Firstname should be longer than 2 chars', () => {
			enforce(model.firstName).longerThan(2);
		});
	});

	group('test', () => {
		skip(groupName !== 'test');
		test('firstName', 'Firstname is required', () => {
			enforce(model.test).isNotBlank();
		});
	});

	// Test some of the inputs
	test('lastName', 'Lastname is required', () => {
		enforce(model.lastName).isNotBlank();
	});

	test('email', 'Email is required', () => {
		enforce(model.email).isNotBlank().longerThan(5);
	});

	omitWhen(!model.email, () => {
		test('email', 'Email should be valid', () => {
			enforce(model.email).isEmail();
		});
	});

	// Include subcontrols when passwordGroup is triggered
	include('password').when('passwordGroup');
	include('confirmPassword').when('passwordGroup');

	test('password', 'Password is required', () => {
		enforce(model.passwordGroup.password).isNotBlank();
	});

	test('confirmPassword', 'Passwords should match', () => {
		enforce(model.passwordGroup.password).isNotBlank().equals(model.passwordGroup.confirmPassword);
	});

	test('children', 'Should have at least 1 child', () => {
		enforce(model.children).isNotNullish().longerThan(0);
	});

	// Optimization with omitWhen
	omitWhen(!model.children.length, () => {
		// Testingg controls in FormArray is a bit complex. We need to be able to uniquely identify these controls..
		// .. like [array parent] - [control name] - [index]
		each((model.children as {age: string, name: string}[]), ({ age, name }, index) => {
			test(
				`children-name-${index}`,
				`Name is required`,
				() => {
					enforce(name).isNotBlank();
				},
				`children-name${index}`,
			);

			test(
				`children-age-${index}`,
				`Age is required`,
				() => {
					enforce(age).isNotNullish();
				},
				`children-age${index}`,
			);

			omitWhen(!age, () => {
				test(
					`children-age-${index}`,
					`Minimum age is 6`,
					() => {
						enforce(age).isNumber().greaterThan(5);
					},
					`children-age${index}`,
				);
			});
		});
	});
});
