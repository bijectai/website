import { KIND_LABEL, formatNewsDate, sortedNews } from "../news";
import { Footer } from "./Footer";
import { ProofField } from "./ProofField";
import { TopBar } from "./TopBar";

// /news: research and posts in one dated list, newest first. Rows split by
// hairlines (date | kind | title and summary). Posts open on the site;
// papers link out to where they're published.
export function News() {
  const items = sortedNews();

  return (
    <>
      <ProofField />
      <div className="topbar-gap" aria-hidden="true" />
      <TopBar />

      <main className="news">
        <div className="wrap">
          <h1 className="page-title">News</h1>
          <p className="body news-lede">Research and writing from the team.</p>

          <ol className="news-list">
            {items.map((item) => {
              const external = Boolean(item.href);
              return (
                <li className="news-item" key={item.slug}>
                  <span className="news-date">{formatNewsDate(item.date)}</span>
                  <span className="news-kind">{KIND_LABEL[item.kind]}</span>
                  <div className="news-main">
                    <a
                      className="news-title"
                      href={item.href ?? `/news/${item.slug}`}
                      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                    >
                      {item.title}
                      {external && <span className="news-out" aria-hidden="true"> ↗</span>}
                    </a>
                    <p className="news-summary">{item.summary}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </main>

      <Footer />
    </>
  );
}
