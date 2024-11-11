import { useForm } from '@/hooks/useForm/useForm'
import React from 'react'
import * as v from 'valibot';

function validateForm<T>(schema: v.GenericSchema, values: Partial<T>): Record<keyof T & string, string> {
  const result = v.safeParse(schema, values);
  if (result.issues) {
    const issues = v.flatten(result.issues);
    if (issues.nested) {
      return Object.keys(issues.nested).reduce((acc, key) => {
        const nestedIssues = issues.nested![key];
        if (nestedIssues) {
          acc[key as keyof T & string] = nestedIssues[0];
        }
        return acc;
      }, {} as Record<keyof T & string, string>);
    }
  }

  return {} as Record<keyof T & string, string>;
}

function FormComponent() {
  const Schema = v.pipe(v.object({
    email: v.pipe(
      v.string('This is a required field'),
      v.email('Invalid email')
    ),
    password: v.string('This is a required field'),
    confirmPassword: v.string('This is a required field')
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (values) => values.password === values.confirmPassword,
      'Passwords do not match'
    ),
    ['confirmPassword']
  )
  );

  const [form, {Form, FormField}] = useForm<v.InferOutput<typeof Schema>>({
    validate: (values) => validateForm(Schema, values)
  });

  return (
    <Form onSubmit={(values, event) => { console.log(values); event.preventDefault();}}
    className='flex flex-col gap-2'>
      <FormField name="email" validateOn='submit' revalidateOn='blur'>
        {({ field, props }) => (
          <>
          <input
            onChange={(e) => props.onValueChange(e.target.value)}
            onBlur={props.onBlur}
            name={props.name}
            value={field.value}
            placeholder="Email"
          />
          {field.error && <div className='text-red-500'>{field.error}</div>}
          </>
        )}
      </FormField>
      <FormField name="password">
        {({ field, props }) => (
          <>
          <input
            onChange={(e) => props.onValueChange(e.target.value)}
            onBlur={props.onBlur}
            name={props.name}
            value={field.value}
            type="password"
            placeholder="Password"
          />
          {field.error && <div className='text-red-500'>{field.error}</div>}
          </>
        )}
      </FormField>
      <FormField name="confirmPassword">
        {({ field, props }) => (
          <>
          <input
            onChange={(e) => props.onValueChange(e.target.value)}
            onBlur={props.onBlur}
            name={props.name}
            value={field.value}
            type="password"
            placeholder="Confirm Password"
          />
          {field.error && <div className='text-red-500'>{field.error}</div>}
          </>
        )}
      </FormField>
      <button>Submit</button>
    </Form>
  )
}

export default FormComponent;