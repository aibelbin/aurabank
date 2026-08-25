import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseActions, hasActionBar } from "@/components/cases/CaseActions";
import { CaseSheet } from "@/components/cases/CaseSheet";
import { DocumentPage } from "@/components/chrome/DocumentPage";
import { requireAccount } from "@/lib/auth/session";
import { caseNumber, caseTitle } from "@/lib/cases/presentation";
import { sweepLapsedCases } from "@/lib/cases/sweep";
import { getBankStore } from "@/lib/db/store";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  const store = getBankStore();
  // Applied before reading, so a lapsed case is never shown still awaiting.
  sweepLapsedCases(store);

  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;

  const legalCase = store.cases.byId(numeric);
  if (!legalCase) return null;

  return {
    legalCase,
    remarks: store.remarks.listForCase(numeric),
    exhibits: store.exhibits.listForCase(numeric),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await load((await params).id);
  if (!loaded) return { title: "Case not found — AuraBank" };
  return {
    title: `${caseNumber(loaded.legalCase.id)} — ${caseTitle(loaded.legalCase)} — AuraBank`,
  };
}

export default async function CasePage({ params }: Props) {
  const account = await requireAccount();
  const loaded = await load((await params).id);
  if (!loaded) notFound();

  return (
    <DocumentPage
      name={caseNumber(loaded.legalCase.id)}
      current="/docket"
      account={account}
      reserveAction={hasActionBar(loaded.legalCase, loaded.remarks, account)}
    >
      <CaseSheet {...loaded}>
        <CaseActions legalCase={loaded.legalCase} remarks={loaded.remarks} account={account} />
      </CaseSheet>
    </DocumentPage>
  );
}
