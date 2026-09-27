import RegistrationForm from "../../registration-form";

export default async function EditLivestockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegistrationForm initialEditId={id}/>;
}