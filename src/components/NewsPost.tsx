import { KIND_LABEL, formatNewsDate, type NewsItem } from "../news";
import { POSTS } from "../news/posts";
import { Footer } from "./Footer";
import { NotFound } from "./NotFound";
import { TopBar } from "./TopBar";

// /news/<slug>: one post. A narrow reading column (.post-body sets the
// measure and styles the plain JSX a post is written in).
export function NewsPost({ item }: { item: NewsItem }) {
  const Body = POSTS[item.slug];
  if (!Body) return <NotFound />;

  return (
    <>
      <div className="topbar-gap" aria-hidden="true" />
      <TopBar />

      <main className="post">
        <article className="wrap">
          <a className="post-back" href="/news">
            News
          </a>
          <p className="post-meta">
            <time dateTime={item.date}>{formatNewsDate(item.date)}</time>
            {" · "}
            {KIND_LABEL[item.kind]}
          </p>
          <h1 className="page-title post-title">{item.title}</h1>
          <div className="post-body">
            <Body />
          </div>
        </article>
      </main>

      <Footer />
    </>
  );
}
