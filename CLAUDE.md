# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**M&C Electronics Vina ISO 문서 한국어 번역 저장소** — 베트남 M&C Electronics Vina 공장의 ISO 9001 / IATF 16949 기반 품질경영시스템 문서(베트남어·영어)를 한국어 Markdown으로 번역·저장하는 프로젝트.

- **원본 언어**: 베트남어 (주) + 영어 (일부 혼용)
- **출력 언어**: 한국어 (용어는 `ISO_전용_용어사전.md` 기준 통일)
- **출력 형식**: Markdown (.md), 표·번호목록 중심
- **회사명 일관성**: 문서 내 "M&C Electronics Vina" 유지

## 디렉토리 구조

```
/
├── ISO_전용_용어사전.md       # 한국어-베트남어-영어 통일 용어표 (번역 시 필수 참조)
├── 원문/                      # 소스 파일 (읽기 전용) — .docx / .xlsx / .pdf
│   └── XX.Vietnamese_folder_name/   # 베트남어 폴더명 그대로
└── 한국어번역/                # 번역 결과 — .md만 존재
    ├── XX.Vietnamese_folder_name/   # 원문 폴더명과 완전 동일
    │   └── 원본파일명.md            # 원본 파일명에서 확장자만 .md로 교체
    └── XX_한국어파일명.md           # (구형) 이전 세션에서 생성된 flat 파일 — 신규 작성 금지
```

## 핵심 규칙: 1:1 파일 매핑

- **원문 경로**: `원문/XX.폴더명/파일명.docx` (또는 .xlsx, .pdf)
- **번역 경로**: `한국어번역/XX.폴더명/파일명.md`
- 폴더명은 베트남어 원본 그대로 유지 (번역하지 않음)
- 파일명도 베트남어 원본 그대로 유지, 확장자만 `.md`로 변경
- 번역 폴더(`XX.폴더명/`)가 없으면 새로 생성

## 번역 규칙

1. **용어**: `ISO_전용_용어사전.md`의 한국어 열 우선 사용
2. **문서 헤더**: 문서코드, 시행일, 관리 부서, 개정 이력 반드시 포함
3. **표 형식**: Markdown 표로 변환 (프로세스 흐름, 점검 항목, 기록 관리 등)
4. **고유명사**: 인명, 회사명, 문서번호(예: WH.03.00.03)는 원문 그대로 유지
5. **체크시트 양식**: 빈칸 행과 열 구조를 Markdown 표로 재현

## 소스 파일 추출 방법

소스 파일은 베트남어 경로를 포함하므로 직접 열기 불가. PowerShell COM 자동화를 사용:

```powershell
# 임시 디렉토리로 복사 후 열기 (경로 문제 우회)
$src = Get-ChildItem -LiteralPath '원문\폴더명' | Where-Object { $_.Name -like '파일명*' }
Copy-Item -LiteralPath $src.FullName -Destination 'C:\Temp\iso_extract\' -Force

# Word 문서 (.docx) 텍스트 추출
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('C:\Temp\iso_extract\파일명.docx')
$text = $doc.Content.Text
$doc.Close($false)
$word.Quit()

# Excel 문서 (.xlsx) 텍스트 추출
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open('C:\Temp\iso_extract\파일명.xlsx')
# 셀별로 UsedRange 순회
$wb.Close($false)
$excel.Quit()
```

## 완료 현황 (2025년 기준)

- **총 원문 파일**: 48개 (29개 폴더)
- **번역 완료**: 47개 (폴더 00~29 전체, 단 17.2 PDF 1건 미완)
- **미완료**: `17.Quy trình.../17.2 Quy trình xử lý đơn hàng.pdf` — PDF 추출 불가로 보류

## 문서 유형 및 번역 패턴

| 유형 | 원문 확장자 | 번역 특징 |
|------|-------------|-----------|
| 절차서 (Quy trình) | .docx | 목적·범위·책임·프로세스 흐름·기록 관리 섹션 포함 |
| 지침서 (Hướng dẫn) | .docx | 평가 기준표(S/O/D 등), 분류표 포함 |
| 체크시트 (FORM check sheet) | .xlsx | 점검 항목 표, 평가 점수 집계표, 빈 양식 구조 재현 |
| 절차 흐름도 (엑셀형) | .xlsx | 담당·단계·내용·양식 4열 테이블로 번역 |
| 방침/규정 | .docx / .pdf | 조항 번호 체계 유지 |

## 참조 문서

- `ISO_전용_용어사전.md` — 번역 시 항상 참조. 규격 용어, 품질관리 용어, 약어 포함
- `한국어번역/XX_한국어명.md` (flat 파일) — 이전 세션 번역 결과. 신규 번역 참고용으로만 사용, 덮어쓰기 금지
