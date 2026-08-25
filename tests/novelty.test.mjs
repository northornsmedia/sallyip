import test from "node:test";
import assert from "node:assert/strict";
import { noveltyFramework } from "../src/lib/novelty-service.js";

test("novelty frameworks keep EPO, UK and US legal tests distinct", () => {
  assert.match(noveltyFramework("EPO").legal_test, /Article 54 EPC/);
  assert.match(
    noveltyFramework("United Kingdom").legal_test,
    /clear and unmistakable/,
  );
  assert.match(
    noveltyFramework("United States").legal_test,
    /35 U\.S\.C\. § 102/,
  );
});

test("unresolved jurisdiction never receives an invented universal novelty test", () => {
  const result = noveltyFramework("");
  assert.equal(result.framework, "UNRESOLVED");
  assert.match(result.legal_test, /must be selected and verified/);
});
