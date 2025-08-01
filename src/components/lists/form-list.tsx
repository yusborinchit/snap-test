import { FORM_TYPES } from "~/const";
import { useNotation } from "~/hooks/use-notation";
import { useRoute } from "~/hooks/use-route";
import FormCard from "../cards/form-card";

export default function FormList() {
  const { navigate, getSearchParam } = useRoute();
  const { getNotationsBySessionId } = useNotation();

  const sessionId = getSearchParam("sessionId", "");

  if (!sessionId) navigate("/404");

  const notations = getNotationsBySessionId(sessionId);

  return (
    <ul className="flex flex-col gap-2 text-base text-white">
      {FORM_TYPES.map((form) => (
        <FormCard
          key={form.type}
          url={`/form?sessionId=${sessionId}&type=${form.type}`}
          type={form.type}
          count={notations.filter((n) => n.type === form.type).length}
          color={form.color}
        />
      ))}
    </ul>
  );
}
