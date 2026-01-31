async function main() {
  const tag = process.env.TARGET_TAG;

  if (tag === undefined || tag.length < 1) {
    console.error("tag is empty");

    process.exit(1);
  }
}

main().then();
