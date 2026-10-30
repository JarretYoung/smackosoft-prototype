"use client";

import { useForm, useStore, type AnyFieldApi, type StandardSchemaV1 } from "@tanstack/react-form";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { AppError, Result } from "@/src/contract";
import { errorMessage } from "@/src/lib/errors";
import { firstMessage, splitServerErrors } from "@/src/lib/form-errors";
import { useRevealFirstError } from "@/src/hooks/reveal-errors";
import { useUnsavedChanges } from "@/src/hooks/unsaved-changes";

type Options<TValues, TData> = {
  defaultValues: TValues;
  /** A zod schema (Standard Schema) with plain-language messages. Runs on mount, so a field can speak once it is left. */
  schema: StandardSchemaV1<TValues, unknown>;
  /** Runs when the values are valid. Return a server action's Result, or nothing when the caller handles the outcome. */
  submit: (values: TValues) => Promise<Result<TData> | void> | Result<TData> | void;
  onSuccess?: (data: TData, ctx: { values: TValues; reset: (values: TValues) => void }) => void;
  /** Fields a server error may land on. Defaults to every field. */
  serverFields?: readonly (keyof TValues & string)[];
  /** Where an error that matches no field goes: under a field, or to a handler such as a toast. */
  unmatched?: (keyof TValues & string) | ((error: AppError) => void);
  /** A last check the schema cannot make, such as an async availability lookup. False rejects the submit. */
  ready?: () => boolean;
  /** Guard leaving the page. True guards any change from the defaults, a function decides. */
  unsaved?: boolean | ((values: TValues, saved: TValues) => boolean);
};

/**
 * Form state for one form: TanStack Form wired to our schemas, server action Results, the leave
 * guard and first-error focus. Validation speaks once a field is left, then live. After a submit
 * attempt every field speaks. A server error shows on its field and clears at the next edit.
 */
export function useAppForm<TValues extends Record<string, unknown>, TData = void>(options: Options<TValues, TData>) {
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [rejections, setRejections] = useState(0);
  const reject = () => setRejections((n) => n + 1);
  useRevealFirstError(rejections);

  const form = useForm({
    defaultValues: options.defaultValues,
    validators: { onMount: options.schema, onChange: options.schema },
    listeners: { onChange: () => setServerErrors((current) => (Object.keys(current).length ? {} : current)) },
    onSubmitInvalid: reject,
    onSubmit: async ({ value, formApi }) => {
      if (options.ready && !options.ready()) return reject();
      setServerErrors({});
      const result = await options.submit(value);
      if (!result) return;
      if (result.ok) return options.onSuccess?.(result.data, { values: value, reset: (next) => formApi.reset(next) });

      const fields = options.serverFields ?? (Object.keys(options.defaultValues) as (keyof TValues & string)[]);
      const { matched, unmatched } = splitServerErrors(result.error, fields);
      if (!unmatched) setServerErrors(matched);
      else if (typeof options.unmatched === "function") options.unmatched(result.error);
      else if (options.unmatched) setServerErrors({ [options.unmatched]: errorMessage(result.error) });
      reject();
    },
  });

  const pending = useStore(form.store, (state) => state.isSubmitting);
  const attempted = useStore(form.store, (state) => state.submissionAttempts > 0);
  const dirty = useStore(form.store, (state) => {
    if (typeof options.unsaved === "function") return options.unsaved(state.values, form.options.defaultValues as TValues);
    return !state.isDefaultValue;
  });
  useUnsavedChanges(!!options.unsaved && dirty && !pending);

  /** The message to show for a field, or undefined. */
  const errorOf = (field: AnyFieldApi): string | undefined =>
    serverErrors[field.name] ?? (field.state.meta.isBlurred || attempted ? firstMessage(field.state.meta.errors) : undefined);

  /** Props for a text input bound to a field. Add id, type and keyboard hints at the call site. */
  const inputProps = (field: AnyFieldApi) => ({
    name: field.name,
    value: field.state.value as string,
    onBlur: field.handleBlur,
    onChange: (event: ChangeEvent<HTMLInputElement>) => field.handleChange(event.target.value),
    "aria-invalid": !!errorOf(field),
  });

  /** Spread on the `<form>`. A plain onSubmit, because React clears the fields of a form action after it runs. */
  const formProps = {
    noValidate: true,
    onSubmit: (event: FormEvent) => {
      event.preventDefault();
      event.stopPropagation();
      void form.handleSubmit();
    },
  };

  return { form, formProps, errorOf, inputProps, pending, dirty, attempted };
}
