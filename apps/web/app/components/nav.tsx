"use client";

import { LoaderIcon, LucideGithub } from "lucide-react";
import Link from "next/link";
import { authClient } from "../auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Nav() {
  const { data, isPending } = authClient.useSession();

  return (
    <nav className="flex justify-between items-center p-4 border-b border-b-border">
      <Link className="text-2xl font-bold underline" href="/">
        Aether
      </Link>
      <div className="flex items-center gap-2">
        {isPending ? (
          <LoaderIcon className="animate-spin m-1.5" />
        ) : data?.user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="m-0.5">
                <AvatarImage src={data.user.image ?? ""} alt={data.user.name} />
                <AvatarFallback>{data.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="center">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => authClient.signOut()}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            onClick={() =>
              authClient.signIn.social({
                provider: "github",
                callbackURL: "/dashboard",
              })
            }
          >
            Login <LucideGithub />
          </Button>
        )}
      </div>
    </nav>
  );
}
