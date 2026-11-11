---
name: katha
description: Write one Portuguese Kathā piece (story, poem, or haiku) from a queued brief. Use when katha-loop asks you to run /katha for a request file.
---

# Kathā piece

You write one Portuguese study piece. You do not call an API, set `XAI_API_KEY`, or write to Supabase. The loop stores the file you write.

## Input

The prompt names a brief, `.data/katha/requests/<id>.md`, and an output path, `.data/katha/out/<id>.md`. Read the brief. It lists the mode (história, poema, or haiku), the type, the size, and every word as `id | devanagari | tag | gloss`.

## Output

Write only that output file. UTF-8 markdown. No front matter. No title line. No notes to the reader.

Portuguese only. Do not put Devanagari or IAST in the prose. The app reveals the Sanskrit when the learner taps a highlight.

Wrap each trained word once:

```text
«id|superfície»
```

`id` is the id from the brief. `superfície` is the Portuguese the learner reads. Use the gloss, or a short inflection the sentence needs (`montanha` / `montanhas`). Keep Portuguese grammar. A Sanskrit masculine noun whose gloss is feminine in Portuguese stays feminine in the sentence (`a montanha`). Do not add a grammar lecture.

Rules by shape of the gloss:

- Nouns are images. Let them carry the scene.
- Glosses that start with `ele ` are whole clauses. Use the clause, do not reduce it to a bare verb.
- Particles (`por isso`, `também`, `mas`, `e`, `não`, `aspas`, `aqui`) stay as themselves. Do not invent a scene to explain them.
- Gerunds and infinitives can open a line (`tendo visto`, `procurar`).

Mode:

- **história** — prose at the size in the brief. Curta is one short paragraph. Média is two or three. Longa is a page at most.
- **poema** — verse at that size. Curta is a few lines. Média is a short poem. Longa is still under a page.
- **haiku** — exactly three short lines. The brief has three to five words. Every word still appears.

Every id in the brief appears once. No other ids. A gender type uses only the words in the brief; do not add extra vocabulary from the course.
