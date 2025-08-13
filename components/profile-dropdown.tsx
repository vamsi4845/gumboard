import { signOut } from "next-auth/react";
import Link from "next/link";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "./note";

type Props = {
  user: User | null;
};

export function ProfileDropdown({ user }: Props) {
  const handleSignOut = async () => {
    await signOut();
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Avatar className="w-9 h-9 cursor-pointer">
          <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors ">
            <AvatarImage
              className="w-9 h-9 rounded-full"
              src={user?.image || ""}
              alt={user?.name || ""}
            />
            <AvatarFallback className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-900 dark:text-zinc-100 bg-blue-500 ">
              <span className="text-sm font-medium text-white">
                {user?.name
                  ? user.name.charAt(0).toUpperCase()
                  : user?.email?.charAt(0).toUpperCase()}
              </span>
            </AvatarFallback>
          </div>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="fixed sm:absolute right-0 mt-3 w-full sm:w-64 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
        <div className="py-2 gap-1 flex flex-col">
          <p className="mx-4 font-medium text-zinc-900 dark:text-zinc-100">
            {user?.name || user?.email}
          </p>
          <p className="mx-4 mb-1 text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
          <div className="border-t border-gray-100 dark:border-zinc-800 my-1"></div>
          <Link
            href={"/settings"}
            className="mx-2 flex items-center hover:bg-zinc-200 dark:hover:bg-zinc-800  pl-2 dark:hover:text-zinc-50 text-zinc-800 dark:text-zinc-400 rounded-md text-sm gap-2 py-2"
          >
            Settings
          </Link>

          <div
            onClick={handleSignOut}
            className="mx-2 flex items-center hover:bg-zinc-200 dark:hover:bg-zinc-800 pl-2 dark:hover:text-red-500 rounded-md cursor-pointer text-sm gap-2 py-2"
          >
            Sign Out
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
