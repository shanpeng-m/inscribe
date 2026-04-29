import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useParams } from "react-router-dom";
import posts from "./generated/posts.json";

const Home = () => (
  <div>
    <h1>Inscribe Blog</h1>
    <ul>
      {posts.map((post) => (
        <li key={post.slug}>
          <Link to={`/post/${post.slug}`}>{post.title}</Link>
          <span> - {new Date(post.date).toLocaleDateString()}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Post = () => {
  const { slug } = useParams();
  const post = posts.find((p) => p.slug === slug);
  if (!post) return <div>Post not found</div>;
  return (
    <article>
      <h1>{post.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/post/:slug" element={<Post />} />
    </Routes>
  </BrowserRouter>
);

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
