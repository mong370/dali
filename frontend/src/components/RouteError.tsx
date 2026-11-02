import { useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-neutral-600">Please reload the page. If it keeps happening, try again later.</p>
      <a className="btn-primary" href="/">
        Back to home
      </a>
    </div>
  );
}
