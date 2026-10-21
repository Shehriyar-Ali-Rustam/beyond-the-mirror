"use client";

import { startTransition, useActionState } from "react";

/**
 * Like useActionState, but submits via onSubmit so React doesn't auto-reset the
 * form afterwards — people keep what they typed when validation fails.
 */
export function useActionForm<S>(action: (prev: S | null, formData: FormData) => Promise<S>) {
  const [state, dispatch, pending] = useActionState<S | null, FormData>(action, null);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return [state, onSubmit, pending] as const;
}
