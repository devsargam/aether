"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
  language: string | null;
  defaultBranch: string;
}

export function ImportRepositories() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [repositories, setRepositories] = useState<Array<Repository>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingRepoId, setImportingRepoId] = useState<number | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (success === "true") {
      fetchRepositories();
    } else if (errorParam) {
      setError("Failed to connect to GitHub. Please try again.");
    }
  }, [searchParams]);

  async function fetchRepositories() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/repositories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      setRepositories(data.repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/github/auth";
  }

  async function handleImport(repo: Repository) {
    setImportingRepoId(repo.id);
    setError(null);

    try {
      const response = await fetch("/api/projects/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repo.name,
          repositoryFullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import project");
      }

      // Redirect to dashboard on success
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setImportingRepoId(null);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading repositories...</p>
      </div>
    );
  }

  if (error && repositories.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-destructive text-sm">{error}</div>
        <Button onClick={handleConnect} variant="outline" size="lg">
          Try Again
        </Button>
      </div>
    );
  }

  if (repositories.length > 0) {
    return (
      <div className="space-y-6">
        {error && (
          <div className="text-destructive text-sm bg-destructive/10 p-3 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Select a repository to import
          </p>
          <Button onClick={fetchRepositories} variant="ghost" size="sm">
            Refresh
          </Button>
        </div>

        <div className="grid gap-3">
          {repositories.map((repo) => (
            <Card
              key={repo.id}
              className="p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 truncate">
                    {repo.fullName}
                  </h3>
                  {repo.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && <span>{repo.language}</span>}
                    {repo.private && (
                      <span className="px-2 py-0.5 bg-muted rounded">
                        Private
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleImport(repo)}
                  disabled={importingRepoId !== null}
                >
                  {importingRepoId === repo.id ? "Importing..." : "Import"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={handleConnect} variant="outline" size="lg">
        Import Repository from GitHub
      </Button>
    </div>
  );
}
