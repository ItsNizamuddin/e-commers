import { redirect } from "next/navigation";

interface CategorySlugPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function CategorySlugPage({ params }: CategorySlugPageProps) {
    const { slug } = await params;
    redirect(`/products?category=${encodeURIComponent(slug)}`);
}
