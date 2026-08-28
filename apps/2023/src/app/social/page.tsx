export default function SocialPage() {
  return (
    <main className="social-page">
      <section className="social-card" aria-labelledby="social-title">
        <h1 id="social-title">Social Media Graphics</h1>
        <p>
          Spread the word about your acceptance on Social Media!! Getting
          accepted to a hackathon is no small feat and recruiters from companies
          love to see that you are taking the initiative when making hiring
          decisions. Share the following graphic on LinkedIn, Twitter, or any
          other social media platforms.
        </p>
        <div className="social-downloads">
          <a href="/post.png" download="knight-hacks-2023-post.png">
            Download Post
          </a>
          <a href="/story.png" download="knight-hacks-2023-story.png">
            Download Story
          </a>
        </div>
      </section>
    </main>
  );
}
