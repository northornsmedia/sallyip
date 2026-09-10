#!/usr/bin/env node
// Generates public/word-addin/manifest.xml from APP_ORIGIN. No hardcoded prod domain in source.
import fs from 'node:fs';
const origin = (process.env.APP_ORIGIN || 'https://sallyip.com').replace(/\/+$/, '');
const template = `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- Generated from APP_ORIGIN=${origin}. Do not hand-edit domains; re-run scripts/generate-word-manifest.mjs -->
  <Id>3b2c9f0a-sally-ip-playbooks</Id>
  <Version>1.0.0</Version>
  <ProviderName>SallyIP</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="SallyIP Playbooks"/>
  <Description DefaultValue="Run SallyIP playbooks and insert results."/>
  <IconUrl DefaultValue="${origin}/sallyip-logo.png"/>
  <HighResolutionIconUrl DefaultValue="${origin}/sallyip-logo.png"/>
  <SupportUrl DefaultValue="${origin}"/>
  <AppDomains><AppDomain>${origin.replace(/^https?:\\/\\//, '')}</AppDomain></AppDomains>
  <Hosts><Host Name="Document"/></Hosts>
  <Requirements><Sets><Set Name="SharedRuntime" MinVersion="1.1"/></Sets></Requirements>
  <DefaultSettings><SourceLocation DefaultValue="${origin}/word-addin/taskpane.html"/></DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
</OfficeApp>
`;
fs.writeFileSync(new URL('../public/word-addin/manifest.xml', import.meta.url), template);
console.log(`wrote manifest for ${origin}`);
