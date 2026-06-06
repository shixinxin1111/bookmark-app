import { useEffect } from "react";
import { Form, Input, Modal } from "@arco-design/web-react";
import type { BookmarkCategoryFormValues } from "@/types/bookmark";

type CategoryFormModalProps = {
  initialValues?: BookmarkCategoryFormValues;
  mode: "create" | "edit";
  visible: boolean;
  onCancel(): void;
  onSubmit(values: BookmarkCategoryFormValues): Promise<void> | void;
};

const defaultValues: BookmarkCategoryFormValues = {
  name: "",
};

/**
 * CategoryFormModal 渲染创建和编辑分类共用的表单弹窗。
 */
export function CategoryFormModal({
  initialValues,
  mode,
  visible,
  onCancel,
  onSubmit,
}: CategoryFormModalProps) {
  const [form] = Form.useForm<BookmarkCategoryFormValues>();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues ?? defaultValues);
      return;
    }

    form.resetFields();
  }, [form, initialValues, visible]);

  async function handleSubmit() {
    const values = await form.validate();
    await onSubmit({
      name: values.name.trim(),
    });
  }

  return (
    <Modal
      title={mode === "create" ? "创建分类" : "编辑分类"}
      visible={visible}
      onCancel={onCancel}
      onOk={() => handleSubmit()}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          field="name"
          label="分类名称"
          rules={[
            {
              required: true,
              validator: (value, callback) => {
                if (!value?.trim()) {
                  callback("请输入分类名称");
                  return;
                }

                callback();
              },
            },
          ]}
        >
          <Input allowClear maxLength={32} placeholder="例如：工作资料" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
