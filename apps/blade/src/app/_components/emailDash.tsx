"use client";

import { useEffect, useRef, useState } from "react";

import { EmailSectionOne } from "./emailp1";
import { EmailSectionTwo } from "./emailp2";

interface EmailFormData {
  to: string;
  from: string;
  subject: string;
  body: string;
  recipients?: string[]; // For batch mode
  isBatchMode?: boolean;
}

export const EmailDash = () => {
  const [showSectionTwo, setShowSectionTwo] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [emailData, setEmailData] = useState<EmailFormData | null>(null);
  const sectionTwoRef = useRef<HTMLDivElement>(null);
  const sectionOneRef = useRef<HTMLDivElement>(null);

  const handleSchedule = (data: EmailFormData) => {
    setEmailData(data);
    setShowSectionTwo(true);
    setIsClosing(false);
  };

  const handleModeChange = (isBatchMode: boolean) => {
    if (emailData) {
      setEmailData({ ...emailData, isBatchMode });
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    setTimeout(() => {
      setShowSectionTwo(false);
      setIsClosing(false);
      setEmailData(null);
    }, 700);
  };

  useEffect(() => {
    if (showSectionTwo && !isClosing && sectionTwoRef.current) {
      sectionTwoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showSectionTwo, isClosing]);

  return (
    <div className="py-10 md:py-20">
      <div ref={sectionOneRef}>
        <EmailSectionOne
          onSchedule={handleSchedule}
          onModeChange={handleModeChange}
        />
      </div>
      {showSectionTwo && emailData && (
        <div ref={sectionTwoRef}>
          <EmailSectionTwo
            onClose={handleClose}
            isClosing={isClosing}
            emailData={emailData}
          />
        </div>
      )}
    </div>
  );
};
