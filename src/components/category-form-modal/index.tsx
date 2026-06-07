import { useEffect } from "react";
import { Form, Input, Modal } from "@arco-design/web-react";
import type { BookmarkCategoryFormValues } from "@/types/bookmark";

type CategoryFormModalProps = {
  existingNames?: string[];
  initialValues?: BookmarkCategoryFormValues;
  mode: "create" | "edit";
  visible: boolean;
  onCancel(): void;
  onSubmit(values: BookmarkCategoryFormValues): Promise<void> | void;
};

const defaultValues: BookmarkCategoryFormValues = {
  name: "",
};

function normalizeNameForCompare(name: string) {
  return name.trim().toLocaleLowerCase();
}

/**
 * CategoryFormModal 渲染创建和编辑分类共用的表单弹窗。
 */
export function CategoryFormModal({
  existingNames = [],
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

  return (
    <Modal
      title={mode === "create" ? "创建分类" : "编辑分类"}
      visible={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onSubmit={(values) => void onSubmit(values)}
      >
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

                if (
                  existingNames.some(
                    (name) =>
                      normalizeNameForCompare(name) ===
                      normalizeNameForCompare(value),
                  )
                ) {
                  callback("已存在同名分类");
                  return;
                }

                callback();
              },
            },
          ]}
        >
          <Input allowClear maxLength={32} placeholder="例如：工作资料" />
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
