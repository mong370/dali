import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage } from '../api/client';
import { completeLogin } from '../api/session';
import { FieldError } from '../components/ui';
import { safeRedirect } from '../lib/safeRedirect';
import type { User } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { useAuth } from '../store/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name'),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  useTitle('Create account');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const from = safeRedirect(location.state?.from);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const signUp = useMutation({
    mutationFn: async (values: FormValues) =>
      (await api.post<{ user: User; accessToken: string }>('/auth/register', values)).data,
    onSuccess: async ({ user: created, accessToken }) => {
      await completeLogin(created, accessToken);
      navigate(from, { replace: true });
    },
  });

  if (user && !signUp.isPending) return <Navigate to={from} replace />;

  return (
    <div className="container-page max-w-md py-10">
      <h1 className="font-heading text-2xl font-bold">Create your account</h1>
      <form noValidate onSubmit={handleSubmit((values) => signUp.mutate(values))} className="card mt-4 space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" className="input" {...register('name')} aria-invalid={!!errors.name} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register('email')} aria-invalid={!!errors.email} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="input" {...register('password')} aria-invalid={!!errors.password} />
          <FieldError message={errors.password?.message} />
        </div>
        {signUp.error && <p className="text-sm text-red-600" role="alert">{errorMessage(signUp.error)}</p>}
        <button className="btn-primary w-full" disabled={signUp.isPending}>{signUp.isPending ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-sm text-neutral-600">
          Already have an account? <Link to="/login" state={location.state} className="font-medium text-brand hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
