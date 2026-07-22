# JARVIS SYSTEM — Rights and Release Policy

Status: private website preview, 22 July 2026

## Binding project decisions

- Oliver-Frank Pristaff is the named creator and project owner. He expressly
  designated both the geometric System Core and metallic Boot Guardian as the
  intended official JARVIS visual identity on 22 July 2026. Source provenance
  and third-party-rights clearance remain release gates.
- Original JARVIS website, design, text, documentation and code are published
  with **all rights reserved**, not under an open-source licence.
- No ISO, installer image, binaries, signing material or private engineering
  artifact may be included in this website or its deployment repository.
- The website must not claim that a trademark is registered and must not use
  the `®` symbol without a valid registration.
- Third-party software and marks remain under their own rights and licences.

## Protection layers

1. Preserve private authoring history in Git with dated commits and hashes.
2. Keep the full authoring repository private. Publish only a generated static
   deployment package in a separate public Pages repository if GitHub Free is
   used.
3. Carry copyright, no-licence and no-distribution notices in the page footer,
   legal page, repository notice and generated provenance manifest.
4. Keep source assets, ISO files, internal reports, credentials and private
   biographies out of the public deployment package.
5. Run name/trademark clearance before broad or commercial launch. Consider a
   professional Swiss trademark search and registration if appropriate.
6. Preserve release archives and SHA-256 manifests as evidence of publication
   state. These measures support provenance but do not replace legal advice.

## Future operating-system distribution

An eventual JARVIS ISO cannot simply be labelled entirely proprietary while it
contains Linux and other third-party software. Before any ISO release, produce
an SPDX/SBOM-style component inventory, preserve every required licence and
copyright notice, provide corresponding source or written offers where the
applicable licence requires it, and separate Oliver's proprietary JARVIS code
and artwork from third-party components. The current website distributes none
of those files.

## Honest limitation

No public website can technically make its displayed text, pixels or browser
code impossible to copy. Copyright notices, evidence, access separation and
enforcement improve protection; they cannot guarantee that nobody infringes.
The free GitHub Pages route requires a public Pages repository, whose contents
can be viewed and forked under GitHub's platform rules. For maximum secrecy,
do not publish confidential material at all.

## Required before public launch

- Confirm the public contact email and final founder story one last time.
- Confirm the GitHub account/repository and final public URL.
- Perform a conflict search for the project name and visual identity.
- Review provider identification, privacy and legal wording for the intended
  audience and jurisdiction; obtain qualified legal review for formal
  protection claims.
- Run `python3 scripts/build.py --release`; the release build intentionally
  refuses unresolved identity placeholders.
