"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@forge/ui";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@forge/ui/pagination";

interface CustomPaginationProps {
  itemCount: number;
  pageSize: number;
  currentPage: number;
  className?: string;
}

export default function CustomPagination({
  itemCount,
  pageSize,
  currentPage,
  className,
}: CustomPaginationProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pageCount = Math.ceil(itemCount / pageSize);
  if (pageCount <= 1) return null;

  const changePage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push("?" + params.toString());
  };

  const getPageNumber = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];

    if (pageCount <= 5) {
      // Show all page if less then 5
      for (let i = 1; i <= pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Always push the first page so the user can jump back to the front
      pages.push(1);

      // Show the ellipsis if the user is "far" from the start
      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show the pages around the current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(pageCount - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Show an ellipsis if the page is too "far" from the end
      if (currentPage < pageCount - 2) {
        pages.push("ellipsis");
      }

      // Always push the last page for a user to jump to it
      pages.push(pageCount);
    }

    return pages;
  };

  return (
    <Pagination className={cn(className)}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => currentPage > 1 && changePage(currentPage - 1)}
            aria-disabled={currentPage <= 1}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        {getPageNumber().map((page, idx) => (
          <PaginationItem key={idx}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                onClick={() => changePage(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={() =>
              currentPage < pageCount && changePage(currentPage + 1)
            }
            aria-disabled={currentPage >= pageCount}
            className={
              currentPage >= pageCount ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
