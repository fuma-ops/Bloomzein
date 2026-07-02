import { Component, type ReactNode } from "react";
import { Flower2, RotateCcw } from "lucide-react";

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * App-wide safety net. Without this, any render/effect throw unmounts the whole
 * React tree and the user just sees a blank white page (with no way to recover).
 * Here we catch it, keep it on-brand, show what went wrong, and offer a reload.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Leave a breadcrumb so a crash on a real device is diagnosable later.
    try { localStorage.setItem("bloom:last-error", `${error?.message ?? error}`); } catch {}
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[60vh] grid place-items-center p-6 text-center animate-fade-in">
        <div className="bloom-pearl-card pearl-sheen max-w-sm w-full rounded-3xl p-7">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full clay-blob animate-icon-breathe text-white">
            <Flower2 className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <h1 className="mt-4 font-script text-3xl text-hotpink leading-none">A little hiccup ✿</h1>
          <p className="mt-2 text-sm text-rose/80">
            This corner didn't bloom quite right. A quick refresh usually sets it back.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bloom-luxury-btn mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.2} /> Refresh
          </button>
          {this.state.error?.message && (
            <p className="mt-4 text-[10px] text-rose/50 break-words">{this.state.error.message}</p>
          )}
        </div>
      </div>
    );
  }
}
