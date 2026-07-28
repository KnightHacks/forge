"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@forge/api";
import { toast } from "@forge/ui/toast";

import type {
  AlumniBulletinWorkspacePost,
  BulletinSaveHandler,
} from "./alumni-bulletin-workspace";
import { api } from "~/trpc/react";
import { AlumniBulletinWorkspace } from "./alumni-bulletin-workspace";

export function AlumniBulletinAdmin({
  forms,
  posts,
}: {
  forms: RouterOutputs["alumni"]["listLinkableForms"];
  posts: RouterOutputs["alumni"]["listBulletinAdmin"];
}) {
  const router = useRouter();
  const uploadImage = api.alumni.uploadBulletinImage.useMutation();
  const removeImage = api.alumni.removeBulletinImage.useMutation();
  const createPost = api.alumni.createBulletinPost.useMutation();
  const updatePost = api.alumni.updateBulletinPost.useMutation();
  const archivePost = api.alumni.archiveBulletinPost.useMutation();
  const restorePost = api.alumni.restoreBulletinPost.useMutation();
  const reorderPosts = api.alumni.reorderBulletinPosts.useMutation();

  const refresh = () => {
    startTransition(() => router.refresh());
  };

  const withImage: BulletinSaveHandler = async (input, fileContent) => {
    let uploadedObjectName: string | null = null;
    try {
      if (fileContent) {
        const uploaded = await uploadImage.mutateAsync({ fileContent });
        uploadedObjectName = uploaded.objectName;
      }
      await createPost.mutateAsync({
        ...input,
        imageObjectName: uploadedObjectName ?? input.imageObjectName,
      });
      refresh();
      toast.success("Bulletin post created");
    } catch (error) {
      if (uploadedObjectName) {
        await removeImage.mutateAsync({ objectName: uploadedObjectName });
      }
      throw error;
    }
  };

  return (
    <AlumniBulletinWorkspace
      forms={forms}
      posts={posts as AlumniBulletinWorkspacePost[]}
      onCreate={withImage}
      onEdit={async (postId, input, fileContent) => {
        let uploadedObjectName: string | null = null;
        try {
          if (fileContent) {
            const uploaded = await uploadImage.mutateAsync({ fileContent });
            uploadedObjectName = uploaded.objectName;
          }
          await updatePost.mutateAsync({
            ...input,
            imageObjectName: uploadedObjectName ?? input.imageObjectName,
            postId,
          });
          refresh();
          toast.success("Bulletin post updated");
        } catch (error) {
          if (uploadedObjectName) {
            await removeImage.mutateAsync({ objectName: uploadedObjectName });
          }
          throw error;
        }
      }}
      onArchive={async (postId) => {
        await archivePost.mutateAsync({ postId });
        refresh();
        toast.success("Bulletin post archived");
      }}
      onRestore={async (postId) => {
        await restorePost.mutateAsync({ postId });
        refresh();
        toast.success("Bulletin post restored as a draft");
      }}
      onReorder={async (postIds) => {
        await reorderPosts.mutateAsync({ postIds });
        refresh();
      }}
    />
  );
}
