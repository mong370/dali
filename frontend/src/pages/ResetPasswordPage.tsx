import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api/client';
import { useTitle } from '../lib/useTitle';

export default function ResetPasswordPage() {
  useTitle('Choose a new password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const reset = useMutation({
    mutationFn: () => api.post('/auth/reset-password', { token: params.get('token'), password }),
    onSuccess: () => {
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    reset.mutate();
  };

  return (
    <div className="container-page max-w-md py-10">
      <h1 className="font-heading text-2xl font-bold">Choose a new password</h1>
      <form onSubmit={submit} className="card mt-4 space-y-4 p-5">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="input" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {reset.error && <p className="text-sm text-red-600" role="alert">{errorMessage(reset.error)}</p>}
        <button className="btn-primary w-full" disabled={reset.isPending}>Update password</button>
      </form>
    </div>
  );
}
