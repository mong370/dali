import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { useTitle } from '../lib/useTitle';

export default function ForgotPasswordPage() {
  useTitle('Forgot password');
  const [email, setEmail] = useState('');
  const request = useMutation({
    mutationFn: async () =>
      (await api.post<{ message: string }>('/auth/forgot-password', { email })).data.message,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    request.mutate();
  };

  return (
    <div className="container-page max-w-md py-10">
      <h1 className="font-heading text-2xl font-bold">Reset your password</h1>
      {request.data ? (
        <p className="card mt-4 p-5 text-sm" role="status">{request.data}</p>
      ) : (
        <form onSubmit={submit} className="card mt-4 space-y-4 p-5">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {request.error && <p className="text-sm text-red-600" role="alert">{errorMessage(request.error)}</p>}
          <button className="btn-primary w-full" disabled={request.isPending}>Send reset link</button>
        </form>
      )}
      <Link to="/login" className="mt-3 block text-center text-sm text-brand hover:underline">Back to sign in</Link>
    </div>
  );
}
