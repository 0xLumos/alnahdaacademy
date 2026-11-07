import { Link, useParams } from "react-router-dom";
import * as api from "@api";
import { useAuth, useLoad } from "../../lib/auth";
import ChatView from "../../components/ChatView";
import { ErrorNote, Loading, PageTitle } from "../../components/ui";

export default function Thread() {
  const { id } = useParams();
  const { me } = useAuth();
  const { data, error, reload } = useLoad(() => api.getProfile(id), [id]);
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  return (
    <div className="stack chat-page">
      <Link className="link back" to="/admin/inbox">المحادثات</Link>
      <PageTitle action={<Link className="btn btn-ghost btn-sm" to={`/admin/students/${id}`}>ملف الطالب</Link>}>
        {data.full_name}
      </PageTitle>
      <ChatView studentId={id} meId={me.id} emptyText={`ابدأ المحادثة مع ${data.full_name}.`} />
    </div>
  );
}
