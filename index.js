require("dotenv").config();
const { WakaTimeClient, RANGE } = require("wakatime-client");
const Octokit = require("@octokit/rest");

const {
  GIST_ID: gistId = "38913796d6d4f3f471baa354fdaf2aeb",
  GH_TOKEN: githubToken = "9ab5a5b2ea13f162b0013acc072e379705e0a25a",
  WAKATIME_API_KEY: wakatimeApiKey = "7c8d9276-971d-47d1-8aa6-ea2c60e5b989"
} = process.env;

const wakatime = new WakaTimeClient(wakatimeApiKey);

const octokit = new Octokit({ auth: `token ${githubToken}` });

async function main() {
  const stats = await wakatime.getMyStats({ range: RANGE.LAST_7_DAYS });
  await updateGist(stats);
}

async function updateGist(stats) {
  let gist;
  try {
    gist = await octokit.gists.get({ gist_id: gistId });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  const lines = [];
  for (let i = 0; i < Math.min(stats.data.languages.length, 5); i++) {
    const data = stats.data.languages[i];
    const { name, percent, text: time } = data;

    const line = [
      name.padEnd(11),
      time
        .replace(/hrs|hr/g, "h")
        .replace(/mins/g, "m")
        .padEnd(9),
      // time.padEnd(9),
      generateBarChart(percent, 16),
      String(percent.toFixed(1)).padStart(5) + "%"
    ];

    lines.push(line.join(" "));
  }

  console.log(lines);

  if (lines.length == 0) return;

  try {
    // Get original filename to update that same file
    const filename = Object.keys(gist.data.files)[0];
    await octokit.gists.update({
      gist_id: gistId,
      files: {
        [filename]: {
          filename: `📊 Weekly development breakdown`,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent, size) {
  const syms = "░▏▎▍▌▋▊▉█";

  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);
  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;

  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

(async () => {
  await main();
})();
