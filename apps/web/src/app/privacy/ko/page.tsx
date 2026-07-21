import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 · Amgi",
  description: "Amgi가 이용자의 정보를 어떻게 수집하고 사용하며 보호하는지 안내합니다.",
};

export default function PrivacyPageKo() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold mb-1">개인정보처리방침</h1>
        <p className="opacity-70 text-sm">
          최종 수정일: 2026년 7월 21일 ·{" "}
          <Link href="/privacy" className="underline">
            English
          </Link>
        </p>
      </div>

      <p>
        Amgi(이하 &quot;앱&quot;)는 개인이 운영하는 언어 학습 앱입니다. 이 문서는
        Amgi가 어떤 정보를 수집하고, 그 정보를 어떻게 사용하며, 이용자가 어떤
        선택을 할 수 있는지 설명합니다. 문의 사항은{" "}
        <a href="mailto:kenyamjkim@gmail.com" className="underline">
          kenyamjkim@gmail.com
        </a>
        으로 보내주세요.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">수집하는 정보</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>계정 정보.</strong> Google 계정으로 로그인하면 Firebase
            Authentication을 통해 Google 계정의 이름, 이메일 주소, 프로필 사진을
            전달받습니다. 로그인은 전적으로 Google이 처리하므로 Amgi는 비밀번호를
            보거나 저장하지 않습니다.
          </li>
          <li>
            <strong>학습 데이터.</strong> 이용자가 설정한 모국어와 학습 언어,
            저장한 단어와 플래시카드(단어, 번역, 예문, 복습 주기 데이터), 그리고
            연속 학습 기록과 진행 상황을 저장합니다.
          </li>
          <li>
            <strong>기기에 저장되는 설정.</strong> 언어 설정은 더 빠른 사용을 위해
            이용자의 기기에도 저장됩니다.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">정보의 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            저장한 단어, 복습 일정, 연속 학습 기록 등 핵심 기능을 제공하기 위해
            사용합니다.
          </li>
          <li>
            이용자의 모국어와 학습 언어에 맞춰 콘텐츠를 제공하기 위해 사용합니다.
          </li>
          <li>
            Google의 Gemini AI로 단어 설명과 예문을 생성하기 위해 사용합니다. 이때
            단어 또는 표현, 선택적으로 입력한 문맥, 언어 설정만 Gemini에 전송하며
            이름, 이메일, 계정 ID는 전송하지 않습니다.
          </li>
          <li>
            Google Cloud Text-to-Speech로 발음 음성을 생성하기 위해 사용합니다.
            이때는 단어 텍스트만 전송되며, 생성된 음성 파일은 캐시되어 공개 저장소
            URL에서 제공됩니다.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">제3자 서비스</h2>
        <p>
          Amgi는 Google 인프라 위에서 운영됩니다. 다음 Google 서비스가 Amgi를
          대신해 데이터를 처리합니다: Firebase Authentication 및 Cloud
          Firestore(로그인 및 앱 데이터 저장), Firebase Storage(발음 음성 캐시),
          Gemini API(단어 설명 및 예문), Google Cloud Text-to-Speech(발음 음성).
          Google이 이 데이터를 어떻게 처리하는지는{" "}
          <a
            href="https://policies.google.com/privacy?hl=ko"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 개인정보처리방침
          </a>
          에서 확인할 수 있습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">하지 않는 일</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>이용자의 정보를 판매하지 않습니다.</li>
          <li>
            현재 어떠한 분석, 광고, 트래킹 도구도 사용하지 않습니다.
          </li>
          <li>
            기기의 위치, 연락처, 카메라, 사진에 접근하지 않습니다.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">데이터 보관 및 삭제</h2>
        <p>
          이용자의 데이터는 계정이 유지되는 동안 보관됩니다. 현재 Amgi에는 앱
          안에서 직접 계정을 삭제하는 기능이 없습니다. 계정과 관련 데이터의 삭제를
          원하시면{" "}
          <a href="mailto:kenyamjkim@gmail.com" className="underline">
            kenyamjkim@gmail.com
          </a>
          으로 메일을 보내주시면 처리해 드립니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">아동의 개인정보</h2>
        <p>
          Amgi는 만 13세 미만 아동을 대상으로 하지 않으며, 만 13세 미만 아동의
          정보를 고의로 수집하지 않습니다. 아동이 정보를 제공한 것으로 의심되는
          경우 연락해 주시면 해당 정보를 삭제하겠습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">방침의 변경</h2>
        <p>
          앱이 변경됨에 따라 이 방침도 수정될 수 있습니다. 수정할 때마다 위의
          &quot;최종 수정일&quot;을 갱신합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">문의</h2>
        <p>
          이 방침에 대해 궁금한 점이 있으시면{" "}
          <a href="mailto:kenyamjkim@gmail.com" className="underline">
            kenyamjkim@gmail.com
          </a>
          으로 연락해 주세요.
        </p>
      </section>
    </div>
  );
}
