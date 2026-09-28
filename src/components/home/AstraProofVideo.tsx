"use client";

import type finalCopy from "@/content/astra-authority-first-homepage-copy.json";

type VideoCopy = typeof finalCopy.video_proof;

export default function AstraProofVideo({ copy }: { copy: VideoCopy }) {
  return (
    <figure className="astra-video-proof">
      <div className="astra-video-frame">
        <iframe
          src={copy.embed_src}
          title={copy.iframe_title}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a href={copy.direct_link.href} target="_blank" rel="noopener noreferrer" className="astra-text-link">
        {copy.direct_link.label}
      </a>
    </figure>
  );
}
