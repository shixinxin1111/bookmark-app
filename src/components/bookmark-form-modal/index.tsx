import { useEffect, useState } from "react";
import { Button, Form, Input, Message, Modal } from "@arco-design/web-react";
import type { BookmarkFormValues } from "@/types/bookmark";
import { getBookmarkMetadataApi, getErrorMessage } from "@/utils/api";
import {
  isValidBookmarkUrl,
  normalizeBookmarkDomain,
} from "@/utils/bookmark-url";

type BookmarkFormModalProps = {
  initialValues?: BookmarkFormValues;
  mode: "create" | "edit";
  visible: boolean;
  onCancel(): void;
  onSubmit(values: BookmarkFormValues): Promise<void> | void;
};

const defaultValues: BookmarkFormValues = {
  logoUrl: "",
  title: "",
  domain: "",
  note: "",
};

function validateOptionalUrl(
  value: string | undefined,
  callback: (error?: string) => void,
) {
  if (value && !isValidBookmarkUrl(value)) {
    callback("请输入有效的 http/https 链接");
    return;
  }

  callback();
}

function validateRequiredUrl(
  value: string | undefined,
  callback: (error?: string) => void,
) {
  if (!value?.trim()) {
    callback("请输入网站域名");
    return;
  }

  if (!isValidBookmarkUrl(value)) {
    callback("请输入有效的 http/https 链接");
    return;
  }

  callback();
}

/**
 * BookmarkFormModal 渲染网站创建和编辑共用表单，并提供网页元信息自动获取。
 */
export function BookmarkFormModal({
  initialValues,
  mode,
  visible,
  onCancel,
  onSubmit,
}: BookmarkFormModalProps) {
  const [form] = Form.useForm<BookmarkFormValues>();
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues ?? defaultValues);
      return;
    }

    form.resetFields();
  }, [form, initialValues, visible]);

  async function handleFetchMetadata() {
    const domain = form.getFieldValue("domain");
    const bookmarkMetadata = getBookmarkMetadataApi();

    if (!domain?.trim()) {
      Message.error("请先输入网站域名。");
      return;
    }

    if (!bookmarkMetadata) {
      Message.error("网址信息读取能力暂不可用。");
      return;
    }

    setFetchingMetadata(true);

    try {
      const metadata = await bookmarkMetadata.fetch(domain);
      const currentValues = form.getFieldsValue();
      form.setFieldsValue({
        domain: currentValues.domain || metadata.resolvedUrl,
        logoUrl: currentValues.logoUrl || metadata.logoUrl,
        note: currentValues.note || metadata.description,
        title: currentValues.title || metadata.title,
      });
    } catch (error) {
      Message.error(getErrorMessage(error, "网址信息获取失败。"));
    } finally {
      setFetchingMetadata(false);
    }
  }

  async function handleSubmit(values: BookmarkFormValues) {
    await onSubmit({
      logoUrl: values.logoUrl.trim(),
      title: values.title.trim(),
      domain: normalizeBookmarkDomain(values.domain),
      note: values.note.trim(),
    });
  }

  return (
    <Modal
      title={mode === "create" ? "添加网站" : "编辑网站"}
      visible={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onSubmit={(values) => void handleSubmit(values)}
      >
        <Form.Item
          field="domain"
          label="网站域名"
          rules={[
            {
              required: true,
              validator: validateRequiredUrl,
            },
          ]}
        >
          <Input
            allowClear
            addAfter={
              <Button
                htmlType="button"
                loading={fetchingMetadata}
                type="text"
                onClick={() => void handleFetchMetadata()}
              >
                自动获取
              </Button>
            }
            placeholder="https://example.com"
          />
        </Form.Item>

        <Form.Item
          field="title"
          label="网站标题"
          rules={[
            {
              required: true,
              validator: (value, callback) => {
                if (!value?.trim()) {
                  callback("请输入网站标题");
                  return;
                }

                callback();
              },
            },
          ]}
        >
          <Input allowClear maxLength={64} placeholder="例如：Arco Design" />
        </Form.Item>

        <Form.Item
          field="logoUrl"
          label="图标链接"
          rules={[
            {
              validator: validateOptionalUrl,
            },
          ]}
        >
          <Input allowClear placeholder="https://example.com/favicon.ico" />
        </Form.Item>

        <Form.Item field="note" label="提示信息">
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 5 }}
            maxLength={180}
            placeholder="鼠标悬浮网站卡片时展示"
            showWordLimit
          />
        </Form.Item>

        <button
          aria-hidden="true"
          tabIndex={-1}
          type="submit"
          style={{
            border: 0,
            height: 0,
            opacity: 0,
            overflow: "hidden",
            padding: 0,
            position: "absolute",
            width: 0,
          }}
        />
      </Form>
    </Modal>
  );
}
