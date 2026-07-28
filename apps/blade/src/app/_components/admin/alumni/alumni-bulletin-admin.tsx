"use client";

import type { RouterOutputs } from "@forge/api";
import { toast } from "@forge/ui/toast";

import type {
  AlumniBulletinWorkspacePost,
  BulletinSaveHandler,
} from "./alumni-bulletin-workspace";
import { api } from "~/trpc/react";
import { AlumniBulletinWorkspace } from "./alumni-bulletin-workspace";

export function AlumniBulletinAdmin({
  initialForms,
  initialPosts,
}: {
  initialForms: RouterOutputs["alumni"]["listLinkableForms"];
  initialPosts: RouterOutputs["alumni"]["listBulletinAdmin"];
}) {
  const utils = api.useUtils();
  const postsQuery = api.alumni.listBulletinAdmin.useQuery(undefined, {
    initialData: initialPosts,
  });
  const formsQuery = api.alumni.listLinkableForms.useQuery(undefined, {
    initialData: initialForms,
  });
  const uploadImage = api.alumni.uploadBulletinImage.useMutation();
  const removeImage = api.alumni.removeBulletinImage.useMutation();
  const createPost = api.alumni.createBulletinPost.useMutation();
  const updatePost = api.alumni.updateBulletinPost.useMutation();
  const archivePost = api.alumni.archiveBulletinPost.useMutation();
  const restorePost = api.alumni.restoreBulletinPost.useMutation();
  const reorderPosts = api.alumni.reorderBulletinPosts.useMutation();

  const refresh = async () => {
    await utils.alumni.listBulletinAdmin.invalidate();
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
      await refresh();
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
      forms={formsQuery.data}
      posts={postsQuery.data as AlumniBulletinWorkspacePost[]}
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
          await refresh();
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
        await refresh();
        toast.success("Bulletin post archived");
      }}
      onRestore={async (postId) => {
        await restorePost.mutateAsync({ postId });
        await refresh();
        toast.success("Bulletin post restored as a draft");
      }}
      onReorder={async (postIds) => {
        await reorderPosts.mutateAsync({ postIds });
        await refresh();
      }}
    />
  );
}
