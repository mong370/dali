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
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  useTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((state) => state.user);
  const from = safeRedirect(location.state?.from);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const login = useMutation({
    mutationFn: async (values: FormValues) =>
      (await api.post<{ user: User; accessToken: string }>('/auth/login', values)).data,
    onSuccess: async ({ user: signedIn, accessToken }) => {
      await completeLogin(signedIn, accessToken);
      navigate(from, { replace: true });
    },
  });

  if (user && !login.isPending) return <Navigate to={from} replace />;

  return (
    <div className="container-page max-w-md py-10">
      <h1 className="font-heading text-2xl font-bold">Sign in to Dali</h1>
      <form noValidate onSubmit={handleSubmit((values) => login.mutate(values))} className="card mt-4 space-y-4 p-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" {...register('email')} aria-invalid={!!errors.email} />
          <FieldError message={errors.email?.message} />
        </div>
        <div>
          <div className="flex justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-brand hover:underline">Forgot password?</Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" className="input" {...register('password')} aria-invalid={!!errors.password} />
          <FieldError message={errors.password?.message} />
        </div>
        {login.error && <p className="text-sm text-red-600" role="alert">{errorMessage(login.error)}</p>}
        <button className="btn-primary w-full" disabled={login.isPending}>{login.isPending ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-sm text-neutral-600">
          New to Dali? <Link to="/register" state={location.state} className="font-medium text-brand hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
