// 每個 namespace 一個檔案，多人同時改不同區塊時不會互相衝突
import metadata from "./metadata.json";
import common from "./common.json";
import language from "./language.json";
import teamRoles from "./teamRoles.json";
import enums from "./enums.json";
import header from "./header.json";
import sidebar from "./sidebar.json";
import impersonation from "./impersonation.json";
import events from "./events.json";
import registration from "./registration.json";
import eventForm from "./eventForm.json";
import tickets from "./tickets.json";
import team from "./team.json";
import savedInfo from "./savedInfo.json";
import auth from "./auth.json";

const messages = {
  metadata,
  common,
  language,
  teamRoles,
  enums,
  header,
  sidebar,
  impersonation,
  events,
  registration,
  eventForm,
  tickets,
  team,
  savedInfo,
  auth,
};

export default messages;
