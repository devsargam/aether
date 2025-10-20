"use client";

import { Link2, Lock, LucideGithub, Zap } from "lucide-react";
import { authClient } from "../auth-client";
import { Button } from "./ui/button";

export function Landing() {
  return (
    <div className="flex flex-col items-center px-8 py-16">
      <div className="max-w-2xl text-center space-y-6 mb-24">
        <h1 className="text-5xl font-bold tracking-tight">
          Test every pull request
          <br />
          <span className="text-muted-foreground">instantly</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Get ready-to-test URLs for every pull request. No manual deployments,
          no waiting. Just push and preview.
        </p>
        <div className="pt-4">
          <Button
            size="lg"
            onClick={() =>
              authClient.signIn.social({
                provider: "github",
                callbackURL: "/dashboard",
              })
            }
          >
            <LucideGithub />
            Get Started with GitHub
          </Button>
        </div>
      </div>

      <div className="max-w-3xl w-full">
        <h2 className="text-2xl font-semibold text-center mb-12">
          Built for speed
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          <Feature
            icon={<Zap className="size-6" />}
            title="Instant deploys"
            description="Every PR gets a unique URL within seconds of pushing code"
          />
          <Feature
            icon={<Link2 className="size-6" />}
            title="Shareable links"
            description="Share preview URLs with your team or stakeholders instantly"
          />
          <Feature
            icon={<Lock className="size-6" />}
            title="Secure by default"
            description="Private repositories stay private with secure authentication"
          />
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
