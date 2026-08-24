import VotePageClient from "./VotePageClient";

export default async function Page({ params }) {
  const { slug } = await params;
  return <VotePageClient slug={slug} />;
}
