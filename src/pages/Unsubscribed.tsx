import { Link } from "react-router-dom";

const Unsubscribed = () => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl bg-white p-12 text-center shadow-lg dark:bg-gray-900">
        <p className="mb-6 font-display text-2xl italic text-foreground">
          <span className="text-primary">Earthly</span> Trinkets
        </p>
        <h1 className="mb-3 text-xl font-semibold text-foreground">
          You've been unsubscribed
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          We're sorry to see you go. You won't receive any more newsletter
          emails from us.
        </p>
        <Link
          to="/"
          className="inline-block rounded-full bg-primary px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
        >
          Visit Our Store
        </Link>
      </div>
    </div>
  );
};

export default Unsubscribed;
