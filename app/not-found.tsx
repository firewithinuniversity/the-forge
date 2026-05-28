import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
      {/* Flame icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8501A]/15">
        <svg
          className="h-8 w-8 text-[#E8501A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
          />
        </svg>
      </div>

      <h2 className="mb-2 text-xl font-semibold text-[#FAFAFA]">
        Page not found
      </h2>
      <p className="mb-8 max-w-md text-center text-sm text-[#A1A1AA]">
        The page you're looking for doesn't exist or has been moved.
      </p>

      <Link
        href="/"
        className="rounded-lg bg-[#E8501A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#E8501A]/90 focus:outline-none focus:ring-2 focus:ring-[#E8501A]/50"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
