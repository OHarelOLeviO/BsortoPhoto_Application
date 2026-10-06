import { readFile, open } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { parse } from "csv-parse/sync";
import {
  adminClient,
  checked,
  identifier,
  email,
  allUsers,
} from "./admin-client.mjs";
export function validateRows(rows) {
  const seen = new Set();
  return rows.map((row) => {
    const id = identifier(row.member_identifier || "");
    if (seen.has(id)) throw new Error("Duplicate member identifier in CSV");
    seen.add(id);
    const display_name = row.display_name?.trim(),
      team_name = row.team_name?.trim();
    if (
      !display_name ||
      !team_name ||
      display_name.length > 80 ||
      team_name.length > 80
    )
      throw new Error("Invalid display or team name");
    return { member_identifier: id, display_name, team_name };
  });
}
async function run() {
  const [command, arg, output = "credentials.local.jsonl"] =
    process.argv.slice(2);
  if (!["provision", "reset", "disable", "enable"].includes(command) || !arg)
    throw new Error(
      "Usage: provision members.local.csv [credentials.local.jsonl] | reset IDENTIFIER [credentials.local.jsonl] | disable IDENTIFIER | enable IDENTIFIER",
    );
  if (!/^credentials[\w.-]*\.jsonl$/.test(output))
    throw new Error(
      "Credential output must be an ignored credentials*.jsonl filename in this directory",
    );
  const client = adminClient();
  let file;
  async function record(id, password) {
    file ??= await open(output, "a", 0o600);
    await file.writeFile(
      JSON.stringify({ member_identifier: id, access_code: password }) + "\n",
    );
    await file.sync();
  }
  try {
    if (command === "provision") {
      const rows = validateRows(
        parse(await readFile(arg, "utf8"), {
          columns: true,
          bom: true,
          skip_empty_lines: true,
        }),
      );
      const users = await allUsers(client);
      for (const row of rows) {
        let account = users.find(
          (u) => u.email === email(row.member_identifier),
        );
        const team = await checked(
          client
            .from("teams")
            .upsert({ name: row.team_name }, { onConflict: "name" })
            .select("id")
            .single(),
        );
        if (!account) {
          const password = randomBytes(24).toString("base64url");
          const result = await checked(
            client.auth.admin.createUser({
              email: email(row.member_identifier),
              password,
              email_confirm: true,
            }),
          );
          account = result.user;
          users.push(account);
          try {
            await record(row.member_identifier, password);
          } catch {
            await checked(client.auth.admin.deleteUser(account.id));
            throw new Error(
              "Credential export failed; newly created account removed",
            );
          }
        }
        const existing = await checked(
          client
            .from("profiles")
            .select("id")
            .eq("id", account.id)
            .maybeSingle(),
        );
        if (!existing)
          await checked(
            client
              .from("profiles")
              .insert({
                id: account.id,
                member_identifier: row.member_identifier,
                display_name: row.display_name,
                team_id: team.id,
              }),
          );
        console.log(
          `Provisioned ${row.member_identifier}; existing codes preserved`,
        );
      }
    } else {
      const id = identifier(arg);
      const profile = await checked(
        client
          .from("profiles")
          .select("id")
          .eq("member_identifier", id)
          .single(),
      );
      if (command === "reset") {
        const password = randomBytes(24).toString("base64url");
        await record(id, password);
        await checked(
          client.auth.admin.updateUserById(profile.id, { password }),
        );
        console.log(
          "Reset completed. Distribute the last exported code privately.",
        );
      } else {
        const active = command === "enable";
        await checked(
          client
            .from("profiles")
            .update({ is_active: active })
            .eq("id", profile.id),
        );
        await checked(
          client.auth.admin.updateUserById(profile.id, {
            ban_duration: active ? "none" : "876000h",
          }),
        );
        console.log(active ? "Access enabled" : "Access disabled");
      }
    }
  } finally {
    await file?.close();
  }
}
if (process.argv[1]?.endsWith("members.mjs"))
  run().catch((e) => {
    console.error(e.message);
    console.error(
      "Stopped. Resolve the issue and safely rerun. Any generated codes are in the local credential file.",
    );
    process.exitCode = 1;
  });
