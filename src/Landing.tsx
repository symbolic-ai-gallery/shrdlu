import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  BookOpen,
} from "lucide-react";
const steps = [
  ["01", "分析语言", "从词汇和语法结构中识别命令、问题、描述与关系。"],
  [
    "02",
    "解释指代",
    "结合对话上下文，确定“它”“那个棱锥”指向哪个物体；必要时请求澄清。",
  ],
  [
    "03",
    "查询与规划",
    "使用世界知识回答问题，或将目标分解为可以执行的动作与子目标。",
  ],
  [
    "04",
    "行动与记忆",
    "更新世界和对话状态，记录操作及其原因，为后续追问提供依据。",
  ],
];
export default function Landing() {
  return (
    <div className="landing">
      <header className="site-header">
        <a href="#" className="brand">
          <Box size={28} />
          <span>
            SHRDLU<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="主导航">
          <a href="#background">历史背景</a>
          <a href="#system">系统原理</a>
          <a href="#scope">复刻范围</a>
        </nav>
        <a className="landing-button dark compact" href="#/lab">
          打开实验 <ArrowUpRight size={16} />
        </a>
      </header>
      <main className="landing-main">
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="landing-eyebrow">
              人工智能史 / MIT AI LAB / 1968—1970
            </p>
            <h1>
              SHRDLU
              <span>
                语言理解的
                <br />
                积木世界实验
              </span>
            </h1>
            <p className="hero-intro">
              Terry Winograd
              将语言理解放进一个有限的世界：几块积木、几个棱锥、一个盒子，以及一只可以移动它们的机械臂。系统不仅执行指令，还要理解指代、处理歧义，并解释自己的行动。
            </p>
            <div className="hero-links">
              <a href="#/lab" className="landing-button dark">
                进入积木世界 <ArrowRight size={17} />
              </a>
              <a href="#system" className="reading-link">
                阅读系统原理 <ArrowDown size={15} />
              </a>
            </div>
            <dl className="hero-facts">
              <div>
                <dt>研究者</dt>
                <dd>Terry Winograd</dd>
              </div>
              <div>
                <dt>开发时期</dt>
                <dd>1968—1970</dd>
              </div>
              <div>
                <dt>研究环境</dt>
                <dd>MIT 人工智能实验室</dd>
              </div>
            </dl>
          </div>
          <figure className="archive-figure">
            <div className="archive-image">
              <div className="image-heading">
                <span>SHRDLU / ORIGINAL DISPLAY</span>
                <span>01</span>
              </div>
              <img
                src={`${import.meta.env.BASE_URL}archive/shrdlu-1.gif`}
                alt="SHRDLU 的原始黑白显示：线框积木、棱锥和机械臂"
                width="218"
                height="175"
              />
            </div>
            <figcaption>
              <span>原始屏幕显示</span>
              <a
                href="https://hci.stanford.edu/winograd/shrdlu/"
                target="_blank"
                rel="noreferrer"
              >
                Terry Winograd / Stanford 存档 <ArrowUpRight size={12} />
              </a>
            </figcaption>
          </figure>
        </section>
        <section className="knowledge-section" id="background">
          <div className="section-index">
            <span>01 / BACKGROUND</span>
            <h2>
              一个有限世界，
              <br />
              一组完整的问题。
            </h2>
          </div>
          <div className="section-body">
            <p>
              SHRDLU
              是早期自然语言理解研究中的代表性系统。它在积木世界中把语言分析、知识表示、推理与行动联系起来：一句话能否被理解，要通过系统能否在已知世界中正确回答或行动来检验。
            </p>
            <p>
              这个世界的限制也是研究方法的一部分。颜色、形状、尺寸和空间关系都有明确的含义；系统可以检查物体是否存在、上方是否有障碍，以及一个动作是否可执行。这让“理解”不只表现为生成一句听起来合理的回复。
            </p>
            <aside className="research-note">
              <BookOpen size={20} />
              <div>
                <strong>从程序到论文</strong>
                <p>
                  Winograd 在 1971 年的 MIT AI 技术报告第 235
                  号中详细描述了系统。相关研究随后以{" "}
                  <em>Understanding Natural Language</em> 的书名出版。
                </p>
                <a
                  href="https://hci.stanford.edu/winograd/shrdlu/AITR-235.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  阅读原始技术报告 <ArrowUpRight size={13} />
                </a>
              </div>
            </aside>
          </div>
        </section>
        <section className="system-section" id="system">
          <div className="section-intro">
            <div>
              <p className="landing-eyebrow">02 / HOW IT WORKS</p>
              <h2>语言、世界与行动之间的联系</h2>
            </div>
            <p>
              下面概括原系统的工作思路。它不是现代大语言模型的文本续写过程，而是围绕明确知识与程序展开的语言理解。
            </p>
          </div>
          <div className="system-steps">
            {steps.map(([n, title, body], i) => (
              <div key={n}>
                <span className="step-number">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
                {i < 3 && <ArrowRight className="step-arrow" size={18} />}
              </div>
            ))}
          </div>
          <div className="system-footnote">
            <span>原系统的关键组成</span>
            <p>
              MacLisp · PROGRAMMAR 语法分析 · 语义过程 · Microplanner 规划与推理
              · 世界模型与对话上下文
            </p>
          </div>
        </section>
        <section
          className="knowledge-section conversation-lesson"
          id="dialogue"
        >
          <div className="section-index">
            <span>03 / LANGUAGE IN CONTEXT</span>
            <h2>
              对话中的“理解”，
              <br />
              具体指什么？
            </h2>
            <figure className="color-archive">
              <img
                src={`${import.meta.env.BASE_URL}archive/shrdlu-2.gif`}
                alt="犹他大学后期制作的 SHRDLU 积木世界彩色渲染"
                width="225"
                height="176"
                loading="lazy"
              />
              <figcaption>
                后期彩色渲染 / 犹他大学
                <br />
                来源：Winograd 的 SHRDLU 存档
              </figcaption>
            </figure>
          </div>
          <div className="section-body">
            <div className="lesson">
              <span className="lesson-label">命令与行动</span>
              <blockquote>
                <p>PICK UP A BIG RED BLOCK.</p>
                <p>
                  OK. <span>（执行动作）</span>
                </p>
              </blockquote>
              <p>
                系统需要根据颜色、大小和类别选出物体，再规划拿取动作。如果目标被其他物体压住，就必须先移走障碍。
              </p>
            </div>
            <div className="lesson">
              <span className="lesson-label">指代与歧义</span>
              <blockquote>
                <p>GRASP THE PYRAMID.</p>
                <p>I DON'T UNDERSTAND WHICH PYRAMID YOU MEAN.</p>
              </blockquote>
              <p>
                世界里有多个棱锥。“那个棱锥”并不一定能唯一确定目标；请求澄清也是理解过程的一部分。
              </p>
            </div>
            <div className="lesson">
              <span className="lesson-label">目标与解释</span>
              <blockquote>
                <p>WHY?</p>
                <p>TO GET RID OF IT.</p>
              </blockquote>
              <p>
                这段追问出现在前面的堆叠操作之后。系统沿着动作与子目标的关系，解释为什么移动物体、为什么清空积木，以及这些步骤如何服务于用户的要求。
              </p>
            </div>
            <p className="source-note">
              摘自原版演示对话。实验页收录完整的 43
              轮中英文参考记录，并将历史回答与实时运行结果分别展示。
            </p>
          </div>
        </section>
        <section className="scope-section" id="scope">
          <div className="section-intro">
            <div>
              <p className="landing-eyebrow">04 / THIS RECONSTRUCTION</p>
              <h2>这份 Web 复刻实现了什么</h2>
            </div>
            <a className="landing-button outline" href="#/lab">
              打开实验 <ArrowUpRight size={17} />
            </a>
          </div>
          <p className="scope-intro">
            本项目使用现代 TypeScript
            世界与语言引擎，参考原始对话复现交互行为。它不是对 MacLisp
            源码的逐行移植，也不把通过 43
            轮演示等同于完整覆盖原版的全部英文表达。
          </p>
          <div className="scope-table" role="table" aria-label="复刻范围">
            <div role="row">
              <span role="columnheader">部分</span>
              <span role="columnheader">当前能力与边界</span>
            </div>
            {[
              [
                "三维世界",
                "9 个可观察物体、桌面与机械臂。支持旋转、缩放、选择、标签、线框和状态查看。",
              ],
              [
                "英文交互",
                "可执行原版 43 轮流程；领域解释器与开源英文解析器共同处理输入。未覆盖全部复杂英文语法。",
              ],
              [
                "中文交互",
                "支持 43 轮对应中文与受控组合句式。中文输入会展示转换后的英文；部分回答附中文解释。",
              ],
              [
                "规划与解释",
                "根据实际状态搬运、清障、堆叠，处理指代、学习名称与有限堆叠定义，并查询动作历史。",
              ],
              [
                "已知差异",
                "采用确定性布局和离散物理。体积比较、部分左右关系及生成措辞可能与原始记录不同。",
              ],
              [
                "运行方式",
                "所有推理在浏览器本地完成，无大语言模型、后端服务或 API Key。重置会清除当前会话。",
              ],
            ].map(([a, b]) => (
              <div role="row" key={a}>
                <strong role="cell">{a}</strong>
                <p role="cell">{b}</p>
              </div>
            ))}
          </div>
          <p className="implementation-note">
            实现：React · Vite · TypeScript · Tailwind CSS · Base UI ·
            Three.js。语言引擎参考 Santi Ontañón 的 Apache-2.0
            项目，补充实时世界解释、规划历史与中文转换。
          </p>
        </section>
        <section className="references-section">
          <h2>资料与进一步阅读</h2>
          <ol>
            <li>
              <a
                href="https://hci.stanford.edu/winograd/shrdlu/"
                target="_blank"
                rel="noreferrer"
              >
                <span>Terry Winograd — SHRDLU</span>
                <ArrowUpRight size={16} />
              </a>
              <p>原始系统介绍、演示对话、图像与源码档案。</p>
            </li>
            <li>
              <a
                href="https://hci.stanford.edu/winograd/shrdlu/AITR-235.pdf"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  Procedures as a Representation for Data in a Computer Program
                  for Understanding Natural Language
                </span>
                <ArrowUpRight size={16} />
              </a>
              <p>MIT Artificial Intelligence Technical Report 235，1971。</p>
            </li>
            <li>
              <a
                href="https://github.com/santiontanon/SHRDLU"
                target="_blank"
                rel="noreferrer"
              >
                <span>Santi Ontañón — SHRDLU / TypeScript</span>
                <ArrowUpRight size={16} />
              </a>
              <p>现代开源语言引擎与经典积木世界模块。本项目使用其部分源码。</p>
            </li>
          </ol>
        </section>
      </main>
      <footer className="landing-footer">
        <a href="#" className="brand">
          <Box size={20} />
          <span>SHRDLU.</span>
        </a>
        <p>原始研究：Terry Winograd · MIT 人工智能实验室</p>
        <a href="#/lab">
          积木世界实验 <ArrowUpRight size={14} />
        </a>
      </footer>
    </div>
  );
}
