"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect } from "react";

interface AuthFormProps {
  action: (prevState: { error: string | null }, formData: FormData) => Promise<{ error: string | null }>;
  submitLabel: string;
  loadingLabel: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    placeholder: string;
  }>;
}

export function AuthForm({ action, submitLabel, loadingLabel, fields }: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            required
          />
        </div>
      ))}
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90"
        disabled={isPending}
      >
        {isPending ? loadingLabel : submitLabel}
      </Button>
    </form>
  );
}
