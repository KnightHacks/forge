import { Button } from "@forge/ui/button";
import { z } from "zod";
import { useState } from "react";
import { InsertJudgedSubmissionSchema } from "@forge/db/schemas/knight-hacks";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";

import { api } from "~/trpc/react";

import { Slider } from "@forge/ui/slider";

import { Textarea } from "@forge/ui/textarea";





export function JudgeForm(){
  const [isOpen, setIsOpen] = useState<boolean>(false);

  

 
  
  return(

  );
  
}