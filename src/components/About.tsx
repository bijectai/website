import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

// About page. Just the persistent glass top bar over the dark page, then a
// block of copy: two left-aligned paragraphs, a hairline spacer, and two
// right-aligned paragraphs. Placeholder lorem ipsum for now — real copy on
// our methodologies and end goals lands later.
export function About() {
  return (
    <>
      {/* Drops the sticky bar a --bar-gap inset from the top so its pill lines
          up with the logo + CTA corners that float fixed at that same inset. */}
      <div className="topbar-gap" aria-hidden="true" />
      <TopBar />

      <main className="about">
        <div className="about-inner">
          <p className="about-para about-para-left">
            We are here to fundamentally raise the standard for regulated operations. Today, the accepted baseline across industries is "acceptable" manual review—a fragmented process plagued by massive delays and the inevitable, costly risks of human error. We are replacing that standard with a new benchmark: perfect accuracy, absolute consistency, and execution speeds that move as fast as your business. Our mission is to become the operational backbone for regulated teams, allowing them to execute complex, evidence-heavy workflows without pausing for continuous manual sign-offs. By embedding our forward-deployed engineers directly alongside our partners, we ensure that our automated, deterministic checks provide a blanket of uncompromising reliability tailored to every specific domain.
          </p>
          <p className="about-para about-para-left">
            To guarantee that level of operational resilience, we built our control layer fundamentally on Rust and Lean. Both are incredibly fast and distinctly modern, but more importantly, they enforce rigorous strictness. When you are building systems that must not fail, you cannot rely on technology that is prone to breaking or losing underlying support. Choosing mathematically rigorous, memory-safe languages means our architecture is structurally shielded against the failures that plague legacy systems. Furthermore, the active, modern ecosystems behind Rust and Lean allow us to continuously push updates, ensuring our clients receive full, unwavering support for their critical deployments.
          </p>

          <hr className="about-rule" />

          <p className="about-para about-para-right">
            Our company was founded by a team with deep, specialized backgrounds in mathematics and computational sciences. While watching the recent surge in artificial intelligence, we explicitly recognized the critical execution gaps in LLM proficiency—specifically their probabilistic nature, which simply cannot be trusted alone in regulated, high-stakes environments. Instead of leaning into the hype, we tackled this gap by building a solution that reflects our technical roots: a mathematically verifiable system that delivers uncompromising convenience and speed, without ever sacrificing deterministic truth.
          </p>
          <p className="about-para about-para-right">
            Right now, our timeline is deeply focused on high-touch, individual client deployments where our engineers build custom infrastructure by hand. However, as we look to the future, we are building toward a flexible model that empowers compliance officers to independently customize and govern their own control dashboards. We recognize that flexibility is a core operational principle, as no two regulated teams are exactly alike. As we eventually scale beyond the inherent capacity limits of individual engineering deployments, this transition will allow us to broaden our impact while keeping absolute operational resilience and strict policy enforcement at the core of everything we do.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
