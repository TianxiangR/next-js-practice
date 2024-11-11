import React, {  Reducer, useCallback, useEffect, useImperativeHandle, useMemo } from "react";
import { useReducer } from "react";

type StringKeyOf<T> = Extract<keyof T, string>;

export interface FieldState<T = unknown> {
  value?: T;
  error?: string;
  isTouched: boolean;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TFieldValues = Record<string, any>;
export interface FormState<T extends TFieldValues> {
  isTouched: boolean;
  error?: string;
  fields: {
    [K in StringKeyOf<T>]?: FieldState<T[K]>;
  }
}

interface IFormAction {
  type: string;
  payload?: unknown;
};

enum FormActionTypes {
  SET_FIELD_VALUE = "SET_FIELD_VALUE",
  SET_FIELD_ERROR = "SET_FIELD_ERROR",
  SET_FIELD_TOUCHED = "SET_FIELD_TOUCHED",
  SET_FORM_ERROR = "SET_FORM_ERROR",
  SET_FORM_TOUCHED = "SET_FORM_TOUCHED",
  REGISTER_FIELD = "REGISTER_FIELD",
  CLEAR_FORM = "CLEAR_FORM",
  SET_MULTIPLE_FIELD_ERROR = "SET_MULTIPLE_FIELD_ERROR",
}


export interface SetFieldValueAction<T, TKey extends StringKeyOf<T>> extends IFormAction {
  type: FormActionTypes.SET_FIELD_VALUE;
  payload: {
    fieldName: TKey;
    value: T[TKey];
  };
}

export interface SetFieldErrorAction<T, TKey extends StringKeyOf<T>> extends IFormAction {
  type: FormActionTypes.SET_FIELD_ERROR;
  payload: {
    fieldName: TKey;
    error: string | undefined;
  };
}

export interface SetFieldTouchedAction<T, TKey extends StringKeyOf<T>> extends IFormAction {
  type: FormActionTypes.SET_FIELD_TOUCHED;
  payload: {
    fieldName: TKey;
    isTouched: boolean;
  };
}

export interface SetFormErrorAction extends IFormAction {
  type: FormActionTypes.SET_FORM_ERROR;
  payload: {
    error: string;
  };
}

export interface SetFormTouchedAction extends IFormAction {
  type: FormActionTypes.SET_FORM_TOUCHED;
  payload: {
    isTouched: boolean;
  };
}

export interface ClearFormAction extends IFormAction {
  type: FormActionTypes.CLEAR_FORM;
}

export interface RegisterFieldAction<T, TKey extends StringKeyOf<T>> extends IFormAction {
  type: FormActionTypes.REGISTER_FIELD;
  payload: {
    fieldName: TKey;
  };
}

export interface SetMultipleFieldErrorAction<T> extends IFormAction {
  type: FormActionTypes.SET_MULTIPLE_FIELD_ERROR;
  payload: {
    errors: Record<StringKeyOf<T>, string | undefined>;
  };
}

export type AllSetFieldValueActions<T> = {
  [K in StringKeyOf<T>]: K extends string ? SetFieldValueAction<T, K> : never;
}[StringKeyOf<T>];

export type FormAction<T> =
  | SetFieldValueAction<T, StringKeyOf<T>>
  | SetFieldErrorAction<T, StringKeyOf<T>>
  | SetFieldTouchedAction<T, StringKeyOf<T>>
  | SetFormErrorAction
  | SetFormTouchedAction
  | ClearFormAction
  | RegisterFieldAction<T, StringKeyOf<T>>;

const defaultFieldState: FieldState = {
  value: undefined,
  error: undefined,
  isTouched: false,
};

const formReducer = <T extends TFieldValues>(
  prevState: FormState<T>, 
  action: FormAction<T>,
) => {
  let shouldSetFormTouched = false;
  switch(action.type) {
    case FormActionTypes.SET_FIELD_VALUE:
    case FormActionTypes.SET_FIELD_TOUCHED: {
      shouldSetFormTouched = true;
    }
    case FormActionTypes.SET_FIELD_ERROR: {
      const { fieldName, ...rest} = action.payload;
      return {
        ...prevState,
        isTouched: shouldSetFormTouched ?? prevState.isTouched,
        fields: {
          ...prevState.fields,
          [fieldName]: {
            ...(prevState.fields[fieldName] || defaultFieldState),
            ...rest,
            isTouched: shouldSetFormTouched ?? prevState.fields[fieldName]?.isTouched ?? false,
          },
        },
      };
    }
    case FormActionTypes.SET_FORM_ERROR:
    case FormActionTypes.SET_FORM_TOUCHED: {
      return {
        ...prevState,
        ...action.payload,
      };
    }
    case FormActionTypes.CLEAR_FORM: {
      return {
        isTouched: false,
        error: undefined,
        fields: {},
      };
    }
    case FormActionTypes.REGISTER_FIELD: {
      const { fieldName } = action.payload;
      return {
        ...prevState,
        fields: {
          ...prevState.fields,
          [fieldName]: {
            ...defaultFieldState,
          },
        },
      };
    }
    default:
      return prevState;
  }
};

export interface FormProps<T extends TFieldValues> extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSubmit?: (values: T, event: React.FormEvent<HTMLFormElement>) => void;
  formApi: FormApi<T>;
}

const FormForwardRef = React.forwardRef(<T extends TFieldValues,>(props: FormProps<T>, ref: React.Ref<HTMLFormElement>) => {
  const { formApi , onSubmit, ...restProps } = props;
  const {formState, formRef, validate} = formApi;
  const formValues = useMemo(() => {
    return Object.keys(formState.fields).reduce((acc, key) => {
      acc[key as StringKeyOf<T>] = formState.fields[key]?.value as T[StringKeyOf<T>];
      return acc;
    }, {} as T);
  }, [formState.fields]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const validateResult = validate?.(formValues) ?? {} as Record<StringKeyOf<T>, string | undefined>;
    const hasError = Object.keys(validateResult).some(key => validateResult[key]);
    if (hasError) {
      event.preventDefault();
      Object.keys(validateResult).forEach((key) => {
        formApi.dispatch({
          type: FormActionTypes.SET_FIELD_ERROR,
          payload: {
            fieldName: key as StringKeyOf<T>,
            error: validateResult[key],
          },
        });
      });
      return;
    } 

    onSubmit?.(formValues, event);
  }, [formValues, onSubmit]);

  useImperativeHandle(ref, () => formRef.current as HTMLFormElement);

  return (
    <form onSubmit={handleSubmit} ref={formRef} {...restProps} />
  );
});
FormForwardRef.displayName = 'Form';

const Form = FormForwardRef as <T extends TFieldValues>(props: React.PropsWithRef<FormProps<T> & {ref?: React.Ref<HTMLFormElement>}>) => JSX.Element;

export type ValidateTime = 'change' | 'blur' | 'submit';
export interface FormFieldProps<T extends TFieldValues, TKey extends StringKeyOf<T>> {
  name: TKey;
  children: (args: {
    field: FieldState<T[TKey]>;
    props: {
      onValueChange: (value: T[TKey]) => void;
      onBlur: () => void;
      name: TKey;
    };
  }) => React.ReactNode;
  formApi: FormApi<T>;
  /**
   * @default 'submit'
   */
  validateOn?: ValidateTime;
  /**
   * @default 'change'
   */
  revalidateOn?: ValidateTime;
}

export function FormField<T extends TFieldValues, TKey extends StringKeyOf<T>>(props: FormFieldProps<T, TKey>) {
  const { name, children, formApi, validateOn = 'submit', revalidateOn = 'change' } = props;
  const {formState, dispatch, validate} = formApi;
  const field: FieldState<T[TKey]> = formState.fields[name]! || { ...defaultFieldState };
  const formValues = useMemo(() => {
    return Object.keys(formState.fields).reduce((acc, key) => {
      acc[key as StringKeyOf<T>] = formState.fields[key]?.value as T[StringKeyOf<T>];
      return acc;
    }, {} as T);
  }, [formState.fields]);

  const validateField = useCallback((name: TKey, values: T) => {
    const result = validate?.(values) ?? {} as Record<TKey, string | undefined>;
    console.log(result);
    if (result[name]) {
      dispatch({
        type: FormActionTypes.SET_FIELD_ERROR,
        payload: {
          fieldName: name,
          error: result[name],
        },
      });
    } else {
      dispatch({
        type: FormActionTypes.SET_FIELD_ERROR,
        payload: {
          fieldName: name,
          error: undefined,
        },
      });
    }
  }, []);

  const onValueChange = useCallback((value: T[TKey]) => {
    dispatch({
      type: FormActionTypes.SET_FIELD_VALUE,
      payload: {
        fieldName: name,
        value,
      },
    });

    if (field.error && revalidateOn === 'change') {
      validateField(name, {...formValues, [name]: value});
    } else if (validateOn === 'change') {
      validateField(name, {...formValues, [name]: value});
    }
  }, [name, validateOn, revalidateOn, field.error, field.value, formValues]);

  const onBlur = useCallback(() => {
    dispatch({
      type: FormActionTypes.SET_FIELD_TOUCHED,
      payload: {
        fieldName: name,
        isTouched: true,
      },
    });
    if (field.error && revalidateOn === 'blur') {
      validateField(name, formValues);
    } else if (validateOn === 'blur') {
      validateField(name, formValues);
    }
  }, [name, validateOn, revalidateOn, field.error, field.value, formValues]);

  useEffect(() => {
    dispatch({
      type: FormActionTypes.REGISTER_FIELD,
      payload: {
        fieldName: name,
      },
    });
  }, [name]);

  return (
    <>
      {children({ field, props: { onValueChange, onBlur, name } })}
    </>
  );
}

export type Validator<T> = (values: Partial<T>) => Record<StringKeyOf<T>, string | undefined>;

export interface FormApi<T extends TFieldValues> {
  formState: FormState<T>;
  dispatch: React.Dispatch<FormAction<T>>;
  formRef: React.RefObject<HTMLFormElement>;
  validate?: Validator<T>;
}

export interface UseFormProps<T extends TFieldValues> {
  defaultValues?: Partial<T>;
  validate?: Validator<T>;
}

export function useForm<T extends TFieldValues>({defaultValues, validate}: UseFormProps<T> = {}) {
  const [formState, dispatch] = useReducer(formReducer as Reducer<FormState<T>, FormAction<T>>, {
    isTouched: false,
    error: undefined,
  } as FormState<T>, (arg) => {
    const unifiedDefaultValues: Partial<T> = defaultValues || {};
    return {
      ...arg,
      fields: Object.keys(unifiedDefaultValues).reduce((acc, key) => {
        acc[key as StringKeyOf<T>] = {
          ...defaultFieldState,
          value: unifiedDefaultValues[key],
        };
        return acc;
      }, {} as FormState<T>["fields"]),
    };
  });
  const formRef = React.useRef<HTMLFormElement>(null);

  const formApi = useMemo(() => {
    return {
      formState,
      dispatch,
      formRef,
      validate,
    } as FormApi<T>;
  }, [formState]);

  const renderFormRef = React.useRef((props: Omit<FormProps<T>, 'formApi'>) => <Form {...props} formApi={formApi} />);
  const renderFieldRef = React.useRef(<TKey extends StringKeyOf<T>>(props: Omit<FormFieldProps<T, TKey>, 'formApi'>) => <FormField {...props} formApi={formApi} />);
  renderFormRef.current = (props) => <Form {...props} formApi={formApi} />;
  renderFieldRef.current = (props) => <FormField {...props} formApi={formApi} />;

  const FormComponent = useCallback((props: Omit<FormProps<T>, 'formApi'>) => renderFormRef.current(props), []);
  const FormFieldComponent = useCallback(<TKey extends StringKeyOf<T>>(props: Omit<FormFieldProps<T, TKey>, 'formApi'>) => renderFieldRef.current(props), []);

  const clearForm = useCallback(() => {
    dispatch({
      type: FormActionTypes.CLEAR_FORM,
    });
    formRef.current?.reset();
  }, []);

    return useMemo(() => {
      return [
        {
          formState,
          clearForm,
        },
        {
          Form: FormComponent,
          FormField: FormFieldComponent,
        }
      ] as const;
    }, [formState]);
}
