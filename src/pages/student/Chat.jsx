import { useAuth } from "../../lib/auth";
import ChatView from "../../components/ChatView";
import { PageTitle } from "../../components/ui";

export default function StudentChat() {
  const { me } = useAuth();
  return (
    <div className="stack chat-page">
      <PageTitle>المحادثة مع الإدارة</PageTitle>
      <ChatView studentId={me.id} meId={me.id} emptyText="اكتب سؤالك هنا وستردّ عليك الإدارة." />
    </div>
  );
}
