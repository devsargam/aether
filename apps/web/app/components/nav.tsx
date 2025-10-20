import Link from "next/link";
import { Button } from "./ui/button";
import { LucideGithub } from "lucide-react";

export function Nav() {
  return (
    <nav className="flex justify-between items-center p-4 border-b border-b-border">
      <Link className="text-2xl font-bold underline" href="/">
        Aether
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="lg">
          Login <LucideGithub />
        </Button>
      </div>
    </nav>
  );
}
