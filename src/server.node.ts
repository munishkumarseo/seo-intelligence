import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { withPgClient } from "@/db";

const appFetch = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  fetch(request) {
    return withPgClient(() => Promise.resolve(appFetch(request)));
  },
});
