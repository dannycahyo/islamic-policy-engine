import { type RouteConfig, route, layout, index } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_layout.dashboard.tsx"),
    route("rules", "routes/_layout.rules.tsx"),
    route("rules/new", "routes/_layout.rules.new.tsx"),
    route("rules/:ruleId", "routes/_layout.rules.$ruleId.tsx"),
    route("rules/:ruleId/drl", "routes/_layout.rules.$ruleId.drl.tsx"),
    route("rules/:ruleId/test", "routes/_layout.rules.$ruleId.test.tsx"),
    route("audit", "routes/_layout.audit.tsx"),
  ]),
] satisfies RouteConfig;
